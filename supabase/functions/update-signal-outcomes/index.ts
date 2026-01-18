import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

// Types
interface Signal {
  id: string
  pair_id: string
  timeframe: string
  direction: 'LONG' | 'SHORT'
  entry_price: number
  stop_loss: number
  take_profit_1: number
  take_profit_2: number
  take_profit_3: number
  status: string
  created_at: string
  expires_at: string | null
  allowed_pairs: {
    symbol: string
    name: string
  }
}

interface KlineData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface OutcomeResult {
  signalId: string
  pair: string
  timeframe: string
  status: 'hit_tp' | 'hit_sl' | 'expired' | 'active'
  outcome_tp?: number
  pnl_percent?: number
}

// Config
const FETCH_TIMEOUT = 8000
const MAX_RETRIES = 2
const RETRY_DELAYS = [400, 900]

const TIMEFRAME_MAP: Record<string, { bybit: string; okx: string }> = {
  '1H': { bybit: '60', okx: '1H' },
  '4H': { bybit: '240', okx: '4H' }
}

// Utility functions
function convertToOKXSymbol(symbol: string): string {
  const cleanSymbol = symbol.replace(/[/-]/g, '')
  const quotes = ['USDT', 'USDC', 'BUSD', 'USD', 'BTC', 'ETH']
  
  for (const quote of quotes) {
    if (cleanSymbol.endsWith(quote)) {
      const base = cleanSymbol.slice(0, -quote.length)
      return `${base}-${quote}`
    }
  }
  
  return `${cleanSymbol.slice(0, -4)}-${cleanSymbol.slice(-4)}`
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)
      
      if (response.status === 429 || response.status >= 500) {
        if (attempt < MAX_RETRIES) {
          console.log(`[Retry] Attempt ${attempt + 1}/${MAX_RETRIES} after ${RETRY_DELAYS[attempt]}ms`)
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
          continue
        }
      }
      
      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[Timeout] Request timeout (${FETCH_TIMEOUT}ms)`)
      }
      
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
        continue
      }
    }
  }
  
  return null
}

// Fetch OHLC data - OKX primary, Bybit fallback
async function fetchBybitKlines(symbol: string, timeframe: string, limit: number = 200): Promise<KlineData[] | null> {
  const bybitSymbol = symbol.replace('/', '')
  const interval = TIMEFRAME_MAP[timeframe]?.bybit || '60'
  
  const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${bybitSymbol}&interval=${interval}&limit=${limit}`
  
  console.log(`[Bybit] Fetching ${bybitSymbol} ${timeframe}`)
  
  try {
    const response = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'CryptoSignalPro/1.0' }
    })
    
    if (!response || !response.ok) return null
    
    const data = await response.json()
    
    if (data.retCode !== 0 || !data.result?.list?.length) {
      console.error('[Bybit] Invalid response')
      return null
    }
    
    const klines = data.result.list.reverse()
    
    return klines.map((k: string[]) => ({
      time: Number(k[0]),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5])
    }))
  } catch (error) {
    console.error(`[Bybit] Error: ${error}`)
    return null
  }
}

async function fetchOKXKlines(symbol: string, timeframe: string, limit: number = 200): Promise<KlineData[] | null> {
  const okxSymbol = convertToOKXSymbol(symbol)
  const bar = TIMEFRAME_MAP[timeframe]?.okx || '1H'
  
  console.log(`[OKX] Fetching ${okxSymbol} ${timeframe}`)
  
  const allCandles: KlineData[] = []
  let after: string | null = null
  const maxPerRequest = 100
  
  try {
    while (allCandles.length < limit) {
      let url = `https://www.okx.com/api/v5/market/candles?instId=${okxSymbol}&bar=${bar}&limit=${maxPerRequest}`
      if (after) url += `&after=${after}`
      
      const response = await fetchWithRetry(url, {
        headers: { 'User-Agent': 'CryptoSignalPro/1.0' }
      })
      
      if (!response || !response.ok) break
      
      const data = await response.json()
      if (data.code !== '0' || !data.data?.length) break
      
      const candles = data.data.map((k: string[]) => ({
        time: Number(k[0]),
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        volume: Number(k[5])
      }))
      
      const existingTimes = new Set(allCandles.map(c => c.time))
      const newCandles = candles.filter((c: KlineData) => !existingTimes.has(c.time))
      
      if (newCandles.length === 0) break
      
      allCandles.push(...newCandles)
      
      const oldestTime = Math.min(...candles.map((c: KlineData) => c.time))
      after = String(oldestTime)
      
      if (allCandles.length < limit) {
        await new Promise(r => setTimeout(r, 100))
      }
    }
    
    if (allCandles.length === 0) return null
    
    return allCandles.sort((a, b) => a.time - b.time).slice(-limit)
  } catch (error) {
    console.error(`[OKX] Error: ${error}`)
    return null
  }
}

async function fetchKlines(symbol: string, timeframe: string, limit: number = 200): Promise<KlineData[] | null> {
  // Try OKX first (better success rate from edge functions)
  const okxData = await fetchOKXKlines(symbol, timeframe, limit)
  if (okxData?.length) return okxData
  
  // Fallback to Bybit
  console.log('[Fallback] OKX failed, trying Bybit...')
  const bybitData = await fetchBybitKlines(symbol, timeframe, limit)
  if (bybitData?.length) return bybitData
  
  console.error(`[Error] All APIs failed for ${symbol}`)
  return null
}

// Determine outcome from candles - CONSERVATIVE approach
function determineOutcome(
  signal: Signal,
  candles: KlineData[]
): { status: 'hit_tp' | 'hit_sl' | 'active'; outcome_tp?: number; closedAt?: number; outcomePrice?: number } {
  const { direction, entry_price, stop_loss, take_profit_1, take_profit_2, take_profit_3, created_at } = signal
  const signalTime = new Date(created_at).getTime()
  
  // Filter to candles after signal creation
  const relevantCandles = candles.filter(c => c.time >= signalTime)
  
  if (relevantCandles.length === 0) {
    return { status: 'active' }
  }
  
  let slHitCandle: KlineData | null = null
  let tp1HitCandle: KlineData | null = null
  let tp2HitCandle: KlineData | null = null
  let tp3HitCandle: KlineData | null = null
  
  for (const candle of relevantCandles) {
    if (direction === 'LONG') {
      // LONG: SL hit when low <= stop_loss
      if (!slHitCandle && candle.low <= stop_loss) {
        slHitCandle = candle
      }
      // TPs hit when high >= tp level
      if (!tp1HitCandle && candle.high >= take_profit_1) {
        tp1HitCandle = candle
      }
      if (!tp2HitCandle && candle.high >= take_profit_2) {
        tp2HitCandle = candle
      }
      if (!tp3HitCandle && candle.high >= take_profit_3) {
        tp3HitCandle = candle
      }
    } else {
      // SHORT: SL hit when high >= stop_loss
      if (!slHitCandle && candle.high >= stop_loss) {
        slHitCandle = candle
      }
      // TPs hit when low <= tp level
      if (!tp1HitCandle && candle.low <= take_profit_1) {
        tp1HitCandle = candle
      }
      if (!tp2HitCandle && candle.low <= take_profit_2) {
        tp2HitCandle = candle
      }
      if (!tp3HitCandle && candle.low <= take_profit_3) {
        tp3HitCandle = candle
      }
    }
  }
  
  // Determine earliest hit
  const slTime = slHitCandle?.time ?? Infinity
  const tp1Time = tp1HitCandle?.time ?? Infinity
  const tp2Time = tp2HitCandle?.time ?? Infinity
  const tp3Time = tp3HitCandle?.time ?? Infinity
  
  // Find highest TP reached BEFORE SL (conservative)
  // If SL and any TP in same candle => SL wins (conservative)
  
  if (slHitCandle && slTime <= Math.min(tp1Time, tp2Time, tp3Time)) {
    // SL hit first or in same candle as TP => LOSS
    return {
      status: 'hit_sl',
      closedAt: slTime,
      outcomePrice: stop_loss
    }
  }
  
  // Check TPs in order of highest first
  if (tp3HitCandle && tp3Time < slTime) {
    return {
      status: 'hit_tp',
      outcome_tp: 3,
      closedAt: tp3Time,
      outcomePrice: take_profit_3
    }
  }
  
  if (tp2HitCandle && tp2Time < slTime) {
    return {
      status: 'hit_tp',
      outcome_tp: 2,
      closedAt: tp2Time,
      outcomePrice: take_profit_2
    }
  }
  
  if (tp1HitCandle && tp1Time < slTime) {
    return {
      status: 'hit_tp',
      outcome_tp: 1,
      closedAt: tp1Time,
      outcomePrice: take_profit_1
    }
  }
  
  // If SL hit but no TP before it
  if (slHitCandle) {
    return {
      status: 'hit_sl',
      closedAt: slTime,
      outcomePrice: stop_loss
    }
  }
  
  return { status: 'active' }
}

// Calculate PnL percentage
function calculatePnL(direction: 'LONG' | 'SHORT', entryPrice: number, outcomePrice: number): number {
  if (direction === 'LONG') {
    return ((outcomePrice - entryPrice) / entryPrice) * 100
  } else {
    return ((entryPrice - outcomePrice) / entryPrice) * 100
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    
    // Check auth: either cron secret or admin JWT
    let isAuthorized = cronSecret && expectedSecret && cronSecret === expectedSecret
    
    if (!isAuthorized) {
      // Try admin JWT auth
      const authHeader = req.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '')
        
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        )
        
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
        
        if (!authError && user) {
          // Check if admin
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('is_admin')
            .eq('user_id', user.id)
            .single()
          
          if (profile?.is_admin) {
            isAuthorized = true
            console.log('[Auth] Admin user authorized:', user.email)
          }
        }
      }
    } else {
      console.log('[Auth] Cron secret authorized')
    }
    
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const limit = body.limit || 200
    const timeframeFilter = body.timeframe // optional: '1H' or '4H'
    
    console.log(`[Start] Processing active signals (limit: ${limit}, timeframe: ${timeframeFilter || 'all'})`)

    // Create service role client for updates
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch active signals
    let query = supabase
      .from('signals')
      .select('*, allowed_pairs!inner(symbol, name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (timeframeFilter) {
      query = query.eq('timeframe', timeframeFilter)
    }
    
    const { data: signals, error: fetchError } = await query
    
    if (fetchError) {
      console.error('[Error] Fetching signals:', fetchError)
      throw new Error(`Failed to fetch signals: ${fetchError.message}`)
    }
    
    if (!signals || signals.length === 0) {
      console.log('[Info] No active signals to process')
      return new Response(
        JSON.stringify({ success: true, processed: 0, updated: 0, expired: 0, results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`[Info] Found ${signals.length} active signals to process`)
    
    const now = new Date()
    const results: OutcomeResult[] = []
    let updated = 0
    let expired = 0
    
    for (const signal of signals as Signal[]) {
      const pairSymbol = signal.allowed_pairs?.symbol || 'UNKNOWN'
      
      // Check if expired
      if (signal.expires_at && new Date(signal.expires_at) <= now) {
        console.log(`[Expired] Signal ${signal.id} (${pairSymbol})`)
        
        const { error: updateError } = await supabase
          .from('signals')
          .update({
            status: 'expired',
            closed_at: now.toISOString()
          })
          .eq('id', signal.id)
        
        if (!updateError) {
          expired++
          results.push({
            signalId: signal.id,
            pair: pairSymbol,
            timeframe: signal.timeframe,
            status: 'expired'
          })
        }
        continue
      }
      
      // Fetch candles for this pair/timeframe
      const candles = await fetchKlines(pairSymbol, signal.timeframe, 200)
      
      if (!candles || candles.length === 0) {
        console.warn(`[Skip] No candles for ${pairSymbol}`)
        results.push({
          signalId: signal.id,
          pair: pairSymbol,
          timeframe: signal.timeframe,
          status: 'active'
        })
        continue
      }
      
      // Determine outcome
      const outcome = determineOutcome(signal, candles)
      
      if (outcome.status === 'active') {
        results.push({
          signalId: signal.id,
          pair: pairSymbol,
          timeframe: signal.timeframe,
          status: 'active'
        })
        continue
      }
      
      // Calculate PnL
      const pnlPercent = calculatePnL(
        signal.direction,
        signal.entry_price,
        outcome.outcomePrice!
      )
      
      // Update signal
      const { error: updateError } = await supabase
        .from('signals')
        .update({
          status: outcome.status,
          closed_at: outcome.closedAt ? new Date(outcome.closedAt).toISOString() : now.toISOString(),
          outcome_tp: outcome.outcome_tp || null,
          outcome_price: outcome.outcomePrice,
          pnl_percent: Math.round(pnlPercent * 100) / 100 // Round to 2 decimals
        })
        .eq('id', signal.id)
      
      if (updateError) {
        console.error(`[Error] Updating signal ${signal.id}:`, updateError)
        continue
      }
      
      updated++
      console.log(`[Updated] ${pairSymbol} ${signal.direction} => ${outcome.status}${outcome.outcome_tp ? ` TP${outcome.outcome_tp}` : ''} (${pnlPercent.toFixed(2)}%)`)
      
      results.push({
        signalId: signal.id,
        pair: pairSymbol,
        timeframe: signal.timeframe,
        status: outcome.status,
        outcome_tp: outcome.outcome_tp,
        pnl_percent: Math.round(pnlPercent * 100) / 100
      })
    }
    
    console.log(`[Complete] Processed: ${signals.length}, Updated: ${updated}, Expired: ${expired}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: signals.length,
        updated,
        expired,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('[Error]', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
