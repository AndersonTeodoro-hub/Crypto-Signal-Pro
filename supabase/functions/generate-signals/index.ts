import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

// Types
interface Candle {
  open_time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface SwingPoint {
  index: number
  price: number
  type: 'high' | 'low'
}

interface OrderBlock {
  index: number
  high: number
  low: number
  type: 'bullish' | 'bearish'
}

interface FVG {
  index: number
  high: number
  low: number
  type: 'bullish' | 'bearish'
}

interface SignalSetup {
  setup: 'SWEEP_OB' | 'FVG_TREND' | 'BOS_RETEST' | 'EMA_BOUNCE' | 'VOLUME_DIVERGENCE'
  direction: 'LONG' | 'SHORT'
  entry: number
  stopLoss: number
  takeProfit1: number
  takeProfit2: number
  takeProfit3: number
  confidence: number
  analysis: string
  meta: Record<string, unknown>
}

// Normalized setup with mathematically correct R:R levels
interface NormalizedSetup extends SignalSetup {
  riskR: number
  rrRatios: { tp1: number; tp2: number; tp3: number }
}

// Normalize setup levels: TP1=1.5R, TP2=2.5R, TP3=4.0R
function normalizeSetupLevels(setup: SignalSetup): NormalizedSetup | null {
  const R = Math.abs(setup.entry - setup.stopLoss)
  
  // Invalid risk - cannot proceed
  if (R <= 0) {
    console.warn(`[Normalize] Invalid R=0 for ${setup.setup}`)
    return null
  }
  
  let tp1: number, tp2: number, tp3: number
  
  if (setup.direction === 'LONG') {
    // LONG: SL < Entry < TP1 < TP2 < TP3
    tp1 = setup.entry + (R * 1.5)
    tp2 = setup.entry + (R * 2.5)
    tp3 = setup.entry + (R * 4.0)
  } else {
    // SHORT: TP3 < TP2 < TP1 < Entry < SL
    tp1 = setup.entry - (R * 1.5)
    tp2 = setup.entry - (R * 2.5)
    tp3 = setup.entry - (R * 4.0)
  }
  
  return {
    ...setup,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    riskR: R,
    rrRatios: { tp1: 1.5, tp2: 2.5, tp3: 4.0 }
  }
}

// ============= DATA FETCHING =============

interface KlineData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const TIMEFRAME_MAP: Record<string, { bybit: string; okx: string }> = {
  '15m': { bybit: '15', okx: '15m' },
  '1H':  { bybit: '60', okx: '1H' }
}

const CANDLE_LIMITS: Record<string, number> = {
  '15m': 250,
  '1H':  220
}

// Format price string with precision adapted to magnitude
// Avoids "0.0000" rendering for sub-cent assets (e.g. PEPE ~ 0.00000812)
function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '0'
  const abs = Math.abs(price)
  if (abs >= 1) return price.toFixed(4)
  if (abs >= 0.01) return price.toFixed(6)
  return price.toFixed(8)
}

const FETCH_TIMEOUT = 8000 // 8 seconds
const MAX_RETRIES = 2
const RETRY_DELAYS = [400, 900] // ms

// Symbols where the OKX listing differs from the canonical {BASE}USDT format.
// e.g. RNDR was rebranded to RENDER on OKX.
const OKX_SYMBOL_OVERRIDES: Record<string, string> = {
  'RNDRUSDT': 'RENDER-USDT'
}

// Convert symbol formats: BTCUSDT -> BTC-USDT, ETHUSDT -> ETH-USDT
function convertToOKXSymbol(symbol: string): string {
  // Remove any existing separators first
  const cleanSymbol = symbol.replace(/[/-]/g, '')

  // Check overrides first
  if (OKX_SYMBOL_OVERRIDES[cleanSymbol]) {
    return OKX_SYMBOL_OVERRIDES[cleanSymbol]
  }

  // List of known quote currencies (in priority order)
  const quotes = ['USDT', 'USDC', 'BUSD', 'USD', 'BTC', 'ETH']
  
  for (const quote of quotes) {
    if (cleanSymbol.endsWith(quote)) {
      const base = cleanSymbol.slice(0, -quote.length)
      return `${base}-${quote}`
    }
  }
  
  // Fallback: assume last 4 chars are quote (USDT)
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

async function fetchWithRetry(
  url: string,
  options: RequestInit = {}
): Promise<Response | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)
      
      // Retry only for 429 (rate limit) and 5xx (server errors)
      if (response.status === 429 || response.status >= 500) {
        if (attempt < MAX_RETRIES) {
          console.log(`[Retry] Attempt ${attempt + 1}/${MAX_RETRIES} after ${RETRY_DELAYS[attempt]}ms (status: ${response.status})`)
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
          continue
        }
      }
      
      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[Timeout] Request timeout (${FETCH_TIMEOUT}ms)`)
      } else {
        console.error(`[Fetch] Error: ${error}`)
      }
      
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
        continue
      }
    }
  }
  
  return null
}

async function fetchBybitKlines(
  symbol: string,
  timeframe: '15m' | '1H',
  limit: number = 220
): Promise<KlineData[] | null> {
  // Bybit uses format "BTCUSDT" (no slash)
  const bybitSymbol = symbol.replace('/', '')
  const interval = TIMEFRAME_MAP[timeframe].bybit
  
  const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${bybitSymbol}&interval=${interval}&limit=${limit}`
  
  console.log(`[Bybit] Fetching ${bybitSymbol} ${timeframe} (interval=${interval}, limit=${limit})`)
  
  try {
    const response = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'CryptoSignalPro/1.0' }
    })
    
    if (!response) {
      console.error('[Bybit] All retries failed')
      return null
    }
    
    if (!response.ok) {
      console.error(`[Bybit] API error: ${response.status}`)
      return null
    }
    
    const data = await response.json()
    
    // Validate response
    if (data.retCode !== 0) {
      console.error(`[Bybit] API response error: retCode=${data.retCode}, retMsg=${data.retMsg}`)
      return null
    }
    
    if (!data.result?.list || data.result.list.length === 0) {
      console.error('[Bybit] Empty result.list')
      return null
    }
    
    // Bybit returns in descending order -> reverse to chronological
    const klines = data.result.list.reverse()
    
    console.log(`[Bybit] Success: ${klines.length} candles fetched`)
    
    // Bybit format: [startTime, open, high, low, close, volume, turnover]
    // Convert strings to numbers, time already in ms
    return klines.map((k: string[]) => ({
      time: Number(k[0]),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5])
    }))
    
  } catch (error) {
    console.error(`[Bybit] Unexpected error: ${error}`)
    return null
  }
}

async function fetchOKXKlines(
  symbol: string,
  timeframe: '15m' | '1H',
  limit: number = 220
): Promise<KlineData[] | null> {
  // OKX uses format "BTC-USDT" (with hyphen)
  const okxSymbol = convertToOKXSymbol(symbol)
  const bar = TIMEFRAME_MAP[timeframe].okx
  
  console.log(`[OKX] Fetching ${okxSymbol} ${timeframe} (bar=${bar}, target=${limit} candles)`)
  
  const allCandles: KlineData[] = []
  let after: string | null = null
  const maxPerRequest = 100 // OKX limit per request
  
  try {
    // Paginate until reaching desired limit
    while (allCandles.length < limit) {
      let url = `https://www.okx.com/api/v5/market/candles?instId=${okxSymbol}&bar=${bar}&limit=${maxPerRequest}`
      
      // Use 'after' parameter for pagination (timestamp of oldest candle)
      if (after) {
        url += `&after=${after}`
      }
      
      const response = await fetchWithRetry(url, {
        headers: { 'User-Agent': 'CryptoSignalPro/1.0' }
      })
      
      if (!response) {
        console.error('[OKX] All retries failed')
        break
      }
      
      if (!response.ok) {
        console.error(`[OKX] API error: ${response.status}`)
        break
      }
      
      const data = await response.json()
      
      // Validate response
      if (data.code !== '0') {
        console.error(`[OKX] API response error: code=${data.code}, msg=${data.msg}`)
        break
      }
      
      if (!data.data || data.data.length === 0) {
        console.log('[OKX] No more data available')
        break
      }
      
      // OKX returns in descending order
      // Format: [ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
      const candles = data.data.map((k: string[]) => ({
        time: Number(k[0]),
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        volume: Number(k[5])
      }))
      
      // Avoid duplicates using Set of timestamps
      const existingTimes = new Set(allCandles.map(c => c.time))
      const newCandles = candles.filter((c: KlineData) => !existingTimes.has(c.time))
      
      if (newCandles.length === 0) {
        console.log('[OKX] No new candles (all duplicates)')
        break
      }
      
      allCandles.push(...newCandles)
      
      // Get oldest timestamp for next page
      // OKX 'after' = fetch candles BEFORE this timestamp
      const oldestTime = Math.min(...candles.map((c: KlineData) => c.time))
      after = String(oldestTime)
      
      console.log(`[OKX] Fetched ${newCandles.length} candles, total: ${allCandles.length}`)
      
      // Small delay between requests to avoid rate limiting
      if (allCandles.length < limit) {
        await new Promise(r => setTimeout(r, 100))
      }
    }
    
    if (allCandles.length === 0) {
      console.error('[OKX] No candles fetched')
      return null
    }
    
    // Sort by time (chronological) and limit
    const sortedCandles = allCandles
      .sort((a, b) => a.time - b.time)
      .slice(-limit) // Get the last N candles
    
    console.log(`[OKX] Success: ${sortedCandles.length} candles (after pagination & sort)`)
    
    return sortedCandles
    
  } catch (error) {
    console.error(`[OKX] Unexpected error: ${error}`)
    return null
  }
}

async function fetchKlines(
  symbol: string,
  timeframe: '15m' | '1H',
  limit: number = 220
): Promise<KlineData[] | null> {
  // Try OKX first (Bybit returns 403 from edge function datacenter)
  const okxData = await fetchOKXKlines(symbol, timeframe, limit)
  if (okxData && okxData.length > 0) {
    return okxData
  }
  
  // Fallback to Bybit
  console.log('[Fallback] OKX failed, trying Bybit...')
  const bybitData = await fetchBybitKlines(symbol, timeframe, limit)
  if (bybitData && bybitData.length > 0) {
    return bybitData
  }
  
  console.error(`[Error] All market data APIs failed for ${symbol}`)
  return null
}

// ============= INDICATORS =============

function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)
  
  // Start with SMA
  let sum = 0
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i]
  }
  ema[period - 1] = sum / period
  
  // Calculate EMA
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1]
  }
  
  return ema
}

function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = []
  const gains: number[] = []
  const losses: number[] = []
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  // Calculate initial averages
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period
  
  for (let i = period; i < prices.length; i++) {
    if (avgLoss === 0) {
      rsi[i] = 100
    } else {
      const rs = avgGain / avgLoss
      rsi[i] = 100 - (100 / (1 + rs))
    }
    
    if (i < gains.length) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    }
  }
  
  return rsi
}

function calculateATR(candles: Candle[], period: number = 14): number[] {
  const atr: number[] = []
  if (candles.length < 2) return atr

  const tr: number[] = [candles[0].high - candles[0].low]
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]
    const prevClose = candles[i - 1].close
    tr.push(Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose)
    ))
  }

  // Wilder's smoothing
  let sum = 0
  for (let i = 0; i < tr.length; i++) {
    if (i < period) {
      sum += tr[i]
      atr.push(i === period - 1 ? sum / period : NaN)
    } else {
      const prev = atr[i - 1]
      atr.push((prev * (period - 1) + tr[i]) / period)
    }
  }
  return atr
}

// ============= STRUCTURE =============

function findSwingPoints(candles: Candle[], lookback: number = 5): SwingPoint[] {
  const swings: SwingPoint[] = []
  
  for (let i = lookback; i < candles.length - lookback; i++) {
    const leftHighs = candles.slice(i - lookback, i).map(c => c.high)
    const rightHighs = candles.slice(i + 1, i + lookback + 1).map(c => c.high)
    const currentHigh = candles[i].high
    
    if (currentHigh > Math.max(...leftHighs) && currentHigh > Math.max(...rightHighs)) {
      swings.push({ index: i, price: currentHigh, type: 'high' })
    }
    
    const leftLows = candles.slice(i - lookback, i).map(c => c.low)
    const rightLows = candles.slice(i + 1, i + lookback + 1).map(c => c.low)
    const currentLow = candles[i].low
    
    if (currentLow < Math.min(...leftLows) && currentLow < Math.min(...rightLows)) {
      swings.push({ index: i, price: currentLow, type: 'low' })
    }
  }
  
  return swings.sort((a, b) => a.index - b.index)
}

function identifyTrend(ema50: number[], ema200: number[], currentIndex: number): 'bullish' | 'bearish' | 'ranging' {
  if (!ema50[currentIndex] || !ema200[currentIndex]) return 'ranging'
  
  const diff = ((ema50[currentIndex] - ema200[currentIndex]) / ema200[currentIndex]) * 100
  
  if (diff > 1) return 'bullish'
  if (diff < -1) return 'bearish'
  return 'ranging'
}

// ============= SMC PATTERNS =============

function findOrderBlocks(candles: Candle[], lookback: number = 20): OrderBlock[] {
  const orderBlocks: OrderBlock[] = []
  
  for (let i = lookback; i < candles.length - 3; i++) {
    // Bullish OB: Last bearish candle before strong bullish move
    const current = candles[i]
    const next1 = candles[i + 1]
    const next2 = candles[i + 2]
    
    const isBearish = current.close < current.open
    const strongBullishMove = next1.close > next1.open && 
                             next2.close > next2.open &&
                             next2.close > current.high
    
    if (isBearish && strongBullishMove) {
      orderBlocks.push({
        index: i,
        high: current.high,
        low: current.low,
        type: 'bullish'
      })
    }
    
    // Bearish OB: Last bullish candle before strong bearish move
    const isBullish = current.close > current.open
    const strongBearishMove = next1.close < next1.open && 
                             next2.close < next2.open &&
                             next2.close < current.low
    
    if (isBullish && strongBearishMove) {
      orderBlocks.push({
        index: i,
        high: current.high,
        low: current.low,
        type: 'bearish'
      })
    }
  }
  
  return orderBlocks
}

function findFVGs(candles: Candle[]): FVG[] {
  const fvgs: FVG[] = []
  
  for (let i = 2; i < candles.length; i++) {
    const candle1 = candles[i - 2]
    const candle3 = candles[i]
    
    // Bullish FVG: Gap between candle 1 high and candle 3 low
    if (candle3.low > candle1.high) {
      fvgs.push({
        index: i - 1,
        high: candle3.low,
        low: candle1.high,
        type: 'bullish'
      })
    }
    
    // Bearish FVG: Gap between candle 1 low and candle 3 high
    if (candle3.high < candle1.low) {
      fvgs.push({
        index: i - 1,
        high: candle1.low,
        low: candle3.high,
        type: 'bearish'
      })
    }
  }
  
  return fvgs
}

function detectLiquiditySweep(candles: Candle[], swings: SwingPoint[]): { type: 'high' | 'low', swing: SwingPoint } | null {
  if (swings.length < 2 || candles.length < 3) return null
  
  const lastCandle = candles[candles.length - 1]
  const prevCandle = candles[candles.length - 2]
  
  // Check for sweep of recent swing highs
  const recentHighs = swings.filter(s => s.type === 'high').slice(-5)
  for (const swing of recentHighs) {
    if (prevCandle.high > swing.price && lastCandle.close < swing.price) {
      return { type: 'high', swing }
    }
  }
  
  // Check for sweep of recent swing lows
  const recentLows = swings.filter(s => s.type === 'low').slice(-5)
  for (const swing of recentLows) {
    if (prevCandle.low < swing.price && lastCandle.close > swing.price) {
      return { type: 'low', swing }
    }
  }
  
  return null
}

function detectBOS(candles: Candle[], swings: SwingPoint[]): { type: 'bullish' | 'bearish', level: number } | null {
  if (swings.length < 3) return null
  
  const lastCandle = candles[candles.length - 1]
  const recentSwings = swings.slice(-6)
  
  // Bullish BOS: Price breaks above a recent swing high
  const lastHigh = recentSwings.filter(s => s.type === 'high').slice(-1)[0]
  if (lastHigh && lastCandle.close > lastHigh.price) {
    return { type: 'bullish', level: lastHigh.price }
  }
  
  // Bearish BOS: Price breaks below a recent swing low
  const lastLow = recentSwings.filter(s => s.type === 'low').slice(-1)[0]
  if (lastLow && lastCandle.close < lastLow.price) {
    return { type: 'bearish', level: lastLow.price }
  }
  
  return null
}

// ============= SETUPS =============

function analyzeSetup1_SweepOB(candles: Candle[], swings: SwingPoint[], orderBlocks: OrderBlock[], trend: string): SignalSetup | null {
  const sweep = detectLiquiditySweep(candles, swings)
  if (!sweep) return null

  const lastCandle = candles[candles.length - 1]
  const price = lastCandle.close

  // Find nearest order block
  const relevantOBs = orderBlocks.filter(ob => {
    if (sweep.type === 'high') {
      // After sweeping highs, look for bearish OB above price
      return ob.type === 'bearish' && ob.low > price * 0.99
    } else {
      // After sweeping lows, look for bullish OB below price
      return ob.type === 'bullish' && ob.high < price * 1.01
    }
  }).slice(-1)

  if (relevantOBs.length === 0) return null

  const ob = relevantOBs[0]

  // Counter-trend penalty: SHORT in bullish or LONG in bearish reduces confidence
  const isCounterTrend =
    (sweep.type === 'high' && trend === 'bullish') ||
    (sweep.type === 'low' && trend === 'bearish')
  const confidence = isCounterTrend ? 60 : 75

  if (sweep.type === 'low') {
    // LONG setup
    const entry = (ob.high + ob.low) / 2
    const sl = ob.low * 0.995
    const risk = entry - sl

    return {
      setup: 'SWEEP_OB',
      direction: 'LONG',
      entry,
      stopLoss: sl,
      takeProfit1: entry + risk,
      takeProfit2: entry + risk * 2,
      takeProfit3: entry + risk * 3,
      confidence,
      analysis: `Liquidity Sweep detectado em swing low (${sweep.swing.price.toFixed(2)})${isCounterTrend ? ' [counter-trend]' : ''}. Order Block bullish identificado entre ${ob.low.toFixed(2)} - ${ob.high.toFixed(2)}. Aguardando retorno ao OB para entrada LONG.`,
      meta: { sweep, orderBlock: ob, isCounterTrend }
    }
  } else {
    // SHORT setup
    const entry = (ob.high + ob.low) / 2
    const sl = ob.high * 1.005
    const risk = sl - entry
    
    return {
      setup: 'SWEEP_OB',
      direction: 'SHORT',
      entry,
      stopLoss: sl,
      takeProfit1: entry - risk,
      takeProfit2: entry - risk * 2,
      takeProfit3: entry - risk * 3,
      confidence,
      analysis: `Liquidity Sweep detectado em swing high (${sweep.swing.price.toFixed(2)})${isCounterTrend ? ' [counter-trend]' : ''}. Order Block bearish identificado entre ${ob.low.toFixed(2)} - ${ob.high.toFixed(2)}. Aguardando retorno ao OB para entrada SHORT.`,
      meta: { sweep, orderBlock: ob, isCounterTrend }
    }
  }
}

function analyzeSetup2_FVGTrend(candles: Candle[], fvgs: FVG[], trend: string, rsi: number[]): SignalSetup | null {
  if (trend === 'ranging') return null
  if (fvgs.length === 0) return null
  
  const lastCandle = candles[candles.length - 1]
  const price = lastCandle.close
  const currentRSI = rsi[rsi.length - 1] || 50
  
  // Find unfilled FVGs
  const relevantFVGs = fvgs.filter(fvg => {
    if (trend === 'bullish' && fvg.type === 'bullish') {
      // Price should be near the FVG zone
      return price >= fvg.low * 0.99 && price <= fvg.high * 1.01
    }
    if (trend === 'bearish' && fvg.type === 'bearish') {
      return price >= fvg.low * 0.99 && price <= fvg.high * 1.01
    }
    return false
  }).slice(-1)
  
  if (relevantFVGs.length === 0) return null
  
  const fvg = relevantFVGs[0]
  
  // RSI confirmation
  const rsiConfirm = (trend === 'bullish' && currentRSI < 70) || (trend === 'bearish' && currentRSI > 30)
  if (!rsiConfirm) return null
  
  if (trend === 'bullish') {
    const entry = (fvg.high + fvg.low) / 2
    const sl = fvg.low * 0.99
    const risk = entry - sl
    
    return {
      setup: 'FVG_TREND',
      direction: 'LONG',
      entry,
      stopLoss: sl,
      takeProfit1: entry + risk,
      takeProfit2: entry + risk * 2,
      takeProfit3: entry + risk * 3,
      confidence: 65,
      analysis: `Tendência de ALTA confirmada (EMA50 > EMA200). FVG bullish identificado entre ${fvg.low.toFixed(2)} - ${fvg.high.toFixed(2)}. RSI em ${currentRSI.toFixed(0)} indica espaço para valorização.`,
      meta: { fvg, trend, rsi: currentRSI }
    }
  } else {
    const entry = (fvg.high + fvg.low) / 2
    const sl = fvg.high * 1.01
    const risk = sl - entry
    
    return {
      setup: 'FVG_TREND',
      direction: 'SHORT',
      entry,
      stopLoss: sl,
      takeProfit1: entry - risk,
      takeProfit2: entry - risk * 2,
      takeProfit3: entry - risk * 3,
      confidence: 65,
      analysis: `Tendência de BAIXA confirmada (EMA50 < EMA200). FVG bearish identificado entre ${fvg.low.toFixed(2)} - ${fvg.high.toFixed(2)}. RSI em ${currentRSI.toFixed(0)} indica espaço para desvalorização.`,
      meta: { fvg, trend, rsi: currentRSI }
    }
  }
}

function analyzeSetup3_BOSRetest(candles: Candle[], swings: SwingPoint[], bos: { type: 'bullish' | 'bearish', level: number } | null): SignalSetup | null {
  if (!bos) return null
  
  const lastCandle = candles[candles.length - 1]
  const price = lastCandle.close
  
  // Check if price is retesting the BOS level
  const retestZone = bos.level * 0.02 // 2% zone
  const isRetesting = Math.abs(price - bos.level) <= retestZone
  
  if (!isRetesting) return null
  
  if (bos.type === 'bullish') {
    // Price broke above and is retesting from above
    if (price > bos.level * 0.99) {
      const entry = bos.level * 1.002
      const sl = bos.level * 0.985
      const risk = entry - sl
      
      return {
        setup: 'BOS_RETEST',
        direction: 'LONG',
        entry,
        stopLoss: sl,
        takeProfit1: entry + risk,
        takeProfit2: entry + risk * 2,
        takeProfit3: entry + risk * 3,
        confidence: 70,
        analysis: `Break of Structure bullish em ${bos.level.toFixed(2)}. Preço retestando zona rompida. Entrada LONG no retest com SL abaixo da estrutura.`,
        meta: { bos }
      }
    }
  } else {
    // Price broke below and is retesting from below
    if (price < bos.level * 1.01) {
      const entry = bos.level * 0.998
      const sl = bos.level * 1.015
      const risk = sl - entry
      
      return {
        setup: 'BOS_RETEST',
        direction: 'SHORT',
        entry,
        stopLoss: sl,
        takeProfit1: entry - risk,
        takeProfit2: entry - risk * 2,
        takeProfit3: entry - risk * 3,
        confidence: 70,
        analysis: `Break of Structure bearish em ${bos.level.toFixed(2)}. Preço retestando zona rompida. Entrada SHORT no retest com SL acima da estrutura.`,
        meta: { bos }
      }
    }
  }
  
  return null
}

function analyzeSetup4_EMABounce(
  candles: Candle[],
  ema50: number[],
  ema200: number[],
  trend: string,
  rsi: number[]
): SignalSetup | null {
  if (trend === 'ranging') return null
  if (candles.length < 11) return null

  const lastIdx = candles.length - 1
  const last = candles[lastIdx]
  const prev = candles[lastIdx - 1]
  const currentRSI = rsi[rsi.length - 1] || 50

  // RSI pullback zone
  if (currentRSI < 40 || currentRSI > 60) return null

  // Check touch of EMA50 or EMA200 in last 3 candles
  const BAND = 0.003 // 0.3%
  let touched: { ema: 'EMA50' | 'EMA200'; value: number } | null = null
  for (let i = lastIdx - 2; i <= lastIdx; i++) {
    const c = candles[i]
    const e50 = ema50[i]
    const e200 = ema200[i]
    if (trend === 'bullish') {
      if (e50 && Math.abs(c.low - e50) / e50 <= BAND) { touched = { ema: 'EMA50', value: e50 }; break }
      if (e200 && Math.abs(c.low - e200) / e200 <= BAND) { touched = { ema: 'EMA200', value: e200 }; break }
    } else {
      if (e50 && Math.abs(c.high - e50) / e50 <= BAND) { touched = { ema: 'EMA50', value: e50 }; break }
      if (e200 && Math.abs(c.high - e200) / e200 <= BAND) { touched = { ema: 'EMA200', value: e200 }; break }
    }
  }
  if (!touched) return null

  // Reversal engulfing: opposite direction + larger body than previous
  const currBody = Math.abs(last.close - last.open)
  const prevBody = Math.abs(prev.close - prev.open)
  const currIsBull = last.close > last.open
  const prevIsBull = prev.close > prev.open
  if (currBody <= prevBody) return null
  if (currIsBull === prevIsBull) return null
  if (trend === 'bullish' && !currIsBull) return null
  if (trend === 'bearish' && currIsBull) return null

  // Volume > average of last 10 candles (excluding current)
  const vols = candles.slice(lastIdx - 10, lastIdx).map(c => c.volume)
  const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length
  if (last.volume <= avgVol) return null

  if (trend === 'bullish') {
    const entry = last.close
    const sl = touched.value * 0.995
    const risk = entry - sl
    if (risk <= 0) return null
    return {
      setup: 'EMA_BOUNCE',
      direction: 'LONG',
      entry,
      stopLoss: sl,
      takeProfit1: entry + risk,
      takeProfit2: entry + risk * 2,
      takeProfit3: entry + risk * 3,
      confidence: 70,
      analysis: `Bounce confirmado na ${touched.ema} (${formatPrice(touched.value)}) em tendência de alta. Engulfing bullish com volume > média(10). RSI ${currentRSI.toFixed(0)} em zona de pullback.`,
      meta: { touched, currentRSI, avgVol, candleVol: last.volume }
    }
  } else {
    const entry = last.close
    const sl = touched.value * 1.005
    const risk = sl - entry
    if (risk <= 0) return null
    return {
      setup: 'EMA_BOUNCE',
      direction: 'SHORT',
      entry,
      stopLoss: sl,
      takeProfit1: entry - risk,
      takeProfit2: entry - risk * 2,
      takeProfit3: entry - risk * 3,
      confidence: 70,
      analysis: `Rejeição confirmada na ${touched.ema} (${formatPrice(touched.value)}) em tendência de baixa. Engulfing bearish com volume > média(10). RSI ${currentRSI.toFixed(0)} em zona de pullback.`,
      meta: { touched, currentRSI, avgVol, candleVol: last.volume }
    }
  }
}

function analyzeSetup5_VolumeDivergence(
  candles: Candle[],
  swings: SwingPoint[],
  orderBlocks: OrderBlock[],
  fvgs: FVG[],
  rsi: number[]
): SignalSetup | null {
  if (candles.length < 6 || rsi.length < 6) return null

  const last5 = candles.slice(-5)
  const lastRsi = rsi[rsi.length - 1]
  const prevRsi = rsi[rsi.length - 2]
  if (!Number.isFinite(lastRsi) || !Number.isFinite(prevRsi)) return null

  const highs = last5.map(c => c.high)
  const lows = last5.map(c => c.low)
  const maxHighIdx = highs.indexOf(Math.max(...highs))
  const minLowIdx = lows.indexOf(Math.min(...lows))

  // Bearish divergence → SHORT
  if (maxHighIdx === 4) {
    const prevHighCandle = last5.slice(0, 4).reduce((a, b) => (a.high > b.high ? a : b))
    const volumeDown = last5[4].volume < prevHighCandle.volume
    const rsiDivergence = lastRsi < prevRsi
    if (volumeDown && rsiDivergence) {
      const recent = candles.slice(-10)
      const recentHigh = Math.max(...recent.map(c => c.high))
      const bearishOB = orderBlocks.filter(ob =>
        ob.type === 'bearish' && ob.low >= last5[4].close && ob.low <= recentHigh
      ).slice(-1)[0]
      const bearishFVG = fvgs.filter(f =>
        f.type === 'bearish' && f.low >= last5[4].close && f.low <= recentHigh
      ).slice(-1)[0]
      if (!bearishOB && !bearishFVG) return null

      const lastSwingHigh = swings.filter(s => s.type === 'high').slice(-1)[0]
      if (!lastSwingHigh) return null

      const entry = last5[4].close
      const sl = lastSwingHigh.price * 1.005
      const risk = sl - entry
      if (risk <= 0) return null
      return {
        setup: 'VOLUME_DIVERGENCE',
        direction: 'SHORT',
        entry,
        stopLoss: sl,
        takeProfit1: entry - risk,
        takeProfit2: entry - risk * 2,
        takeProfit3: entry - risk * 3,
        confidence: 65,
        analysis: `Divergência de exaustão: novo high com volume menor (${last5[4].volume.toFixed(2)} < ${prevHighCandle.volume.toFixed(2)}) e RSI caindo (${prevRsi.toFixed(0)} → ${lastRsi.toFixed(0)}). Zona SMC bearish ${bearishOB ? 'OB' : 'FVG'} acima para alvo.`,
        meta: { prevHighVol: prevHighCandle.volume, lastVol: last5[4].volume, rsiPrev: prevRsi, rsiNow: lastRsi }
      }
    }
  }

  // Bullish divergence → LONG
  if (minLowIdx === 4) {
    const prevLowCandle = last5.slice(0, 4).reduce((a, b) => (a.low < b.low ? a : b))
    const volumeDown = last5[4].volume < prevLowCandle.volume
    const rsiDivergence = lastRsi > prevRsi
    if (volumeDown && rsiDivergence) {
      const recent = candles.slice(-10)
      const recentLow = Math.min(...recent.map(c => c.low))
      const bullishOB = orderBlocks.filter(ob =>
        ob.type === 'bullish' && ob.high <= last5[4].close && ob.high >= recentLow
      ).slice(-1)[0]
      const bullishFVG = fvgs.filter(f =>
        f.type === 'bullish' && f.high <= last5[4].close && f.high >= recentLow
      ).slice(-1)[0]
      if (!bullishOB && !bullishFVG) return null

      const lastSwingLow = swings.filter(s => s.type === 'low').slice(-1)[0]
      if (!lastSwingLow) return null

      const entry = last5[4].close
      const sl = lastSwingLow.price * 0.995
      const risk = entry - sl
      if (risk <= 0) return null
      return {
        setup: 'VOLUME_DIVERGENCE',
        direction: 'LONG',
        entry,
        stopLoss: sl,
        takeProfit1: entry + risk,
        takeProfit2: entry + risk * 2,
        takeProfit3: entry + risk * 3,
        confidence: 65,
        analysis: `Divergência de capitulação: novo low com volume menor (${last5[4].volume.toFixed(2)} < ${prevLowCandle.volume.toFixed(2)}) e RSI subindo (${prevRsi.toFixed(0)} → ${lastRsi.toFixed(0)}). Zona SMC bullish ${bullishOB ? 'OB' : 'FVG'} abaixo para alvo.`,
        meta: { prevLowVol: prevLowCandle.volume, lastVol: last5[4].volume, rsiPrev: prevRsi, rsiNow: lastRsi }
      }
    }
  }

  return null
}

// Grade is now determined by AI, not this function
// Kept for backwards compatibility if needed
function getGrade(confidence: number): 'A+' | 'A' | 'B+' | 'B' {
  if (confidence >= 85) return 'A+'
  if (confidence >= 70) return 'A'
  if (confidence >= 60) return 'B+'
  return 'B'
}

// ============= AI CONFIRMATION =============

interface AIConfirmation {
  approve: boolean
  confidence: number // 0-100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'REJECT'
  reason: string // max 2 sentences, English
  riskNotes: string[] // bullet points
  improvements: string[] // what to change to approve
  suggestedAdjustments?: {
    entry?: number
    stopLoss?: number
    takeProfit1?: number
    takeProfit2?: number
    takeProfit3?: number
  }
}

const AI_SYSTEM_PROMPT = `You are an elite institutional trading analyst combining Smart Money Concepts (SMC) with classical Price Action for maximum confluence.

YOUR ROLE: Final quality gate before signals reach retail traders. You validate algorithmic SMC detections and score confluence across multiple factors.

TIMEFRAME RULES:

15m (scalping):
- SL range: 0.3%-2.0% from entry
- Min R:R 1.3 at TP1
- ATR must be > 0.15% (otherwise move is too small)
- Volume spike on setup candle increases confidence
- Directional momentum on last 5 candles is a PLUS (scoring), not a requirement
- Faster invalidation: if price doesn't move in 2-3 candles, setup weakens

1H (intraday swing):
- SL range: 0.5%-4% from entry
- Min R:R 1.5 at TP1
- Clear market structure required (HH/HL or LH/LL)
- EMA alignment with direction required
- Volume confirmation on key candles preferred

HARD REJECT (any timeframe):
- Price structure contradicts direction
- Entry/SL/TP incoherent
- R:R < 1.3 at TP1

NOTE: Ranging markets WITH a clear SMC level (OB/FVG/BOS) are tradeable — score based on confluence, do not auto-reject. Counter-trend trades with explicit reversal evidence (BOS, sweep, divergence) are also acceptable.

CONFLUENCE SCORING (total 80):
+12: Clean structure (HH/HL or LH/LL)
+12: EMA50/200 aligned with direction
+8:  RSI supports (not extreme against)
+8:  Volume confirms setup candle
+8:  Price at key SMC level (OB/FVG/BOS)
+8:  ATR shows adequate volatility
+8:  Last 5 candles directional momentum
+8:  Clean R:R geometry
+8:  No S/R blocking TP1

GRADING:
A+ (70-80): Exceptional, high probability
A  (55-69): Strong, good to trade
B+ (45-54): Acceptable, trade with discipline
REJECT (<45): Insufficient confluence

Grade B is ELIMINATED. 45+ or REJECT. No marginal trades.

When REJECTING: reason (2 sentences), riskNotes, improvements, suggestedAdjustments
When APPROVING: reason (2 sentences), riskNotes, improvements

Respond ONLY via analyze_signal. English only.

Maximum confidence value is 80 (matching the scoring total). Never return confidence above 80.`

async function confirmWithAI(
  pair: string,
  timeframe: string,
  setup: NormalizedSetup,
  candles: Candle[],
  ema50Value: number,
  ema200Value: number,
  rsiValue: number,
  atrValue: number,
  trend: string
): Promise<AIConfirmation | null> {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

  if (!ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY not configured, skipping AI confirmation')
    return null
  }
  
  try {
    // Create candles summary (last 20 candles for context)
    const recentCandles = candles.slice(-20)
    const candlesSummary = recentCandles.map((c, i) => {
      const change = ((c.close - c.open) / c.open * 100).toFixed(2)
      const direction = c.close >= c.open ? 'BULL' : 'BEAR'
      return `${i + 1}. ${direction} O:${formatPrice(c.open)} H:${formatPrice(c.high)} L:${formatPrice(c.low)} C:${formatPrice(c.close)} V:${c.volume.toFixed(2)} (${change}%)`
    }).join('\n')
    
    const lastPrice = candles[candles.length - 1].close
    const riskPercent = (setup.riskR / setup.entry * 100).toFixed(2)
    const atrPercent = (atrValue / lastPrice) * 100
    
    const userPrompt = `Analyze this ${timeframe} setup:

Pair: ${pair} | TF: ${timeframe} | Setup: ${setup.setup} | Dir: ${setup.direction}
Algo confidence: ${setup.confidence}% (your assessment may differ)

Levels: Entry ${formatPrice(setup.entry)} | SL ${formatPrice(setup.stopLoss)} (${riskPercent}%) | TP1 ${formatPrice(setup.takeProfit1)} | TP2 ${formatPrice(setup.takeProfit2)} | TP3 ${formatPrice(setup.takeProfit3)}

Indicators: EMA50 ${formatPrice(ema50Value)} (${lastPrice > ema50Value ? 'ABOVE' : 'BELOW'}) | EMA200 ${formatPrice(ema200Value)} (${lastPrice > ema200Value ? 'ABOVE' : 'BELOW'}) | RSI ${rsiValue.toFixed(1)} | ATR ${formatPrice(atrValue)} (${atrPercent.toFixed(2)}%) | Trend: ${trend.toUpperCase()}

Detection: ${setup.analysis}

Last 20 candles (with volume):
${candlesSummary}

Score confluence and respond via analyze_signal.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: AI_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            name: 'analyze_signal',
            description: 'Provides structured analysis of the trading setup',
            input_schema: {
              type: 'object',
              properties: {
                approve: {
                  type: 'boolean',
                  description: 'true if setup is valid and should be executed, false if rejected'
                },
                confidence: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 80,
                  description: 'Final confidence score (0-80)'
                },
                grade: {
                  type: 'string',
                  enum: ['A+', 'A', 'B+', 'REJECT'],
                  description: 'Grade for the setup quality'
                },
                reason: {
                  type: 'string',
                  description: 'Short reason for approval/rejection (max 2 sentences, in English)'
                },
                riskNotes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of specific risk factors (bullet points, in English)'
                },
                improvements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of improvements that would make this trade valid (in English)'
                },
                suggestedAdjustments: {
                  type: 'object',
                  properties: {
                    entry: { type: 'number' },
                    stopLoss: { type: 'number' },
                    takeProfit1: { type: 'number' },
                    takeProfit2: { type: 'number' },
                    takeProfit3: { type: 'number' }
                  },
                  description: 'Optional: adjusted levels that would make the trade valid'
                }
              },
              required: ['approve', 'confidence', 'grade', 'reason', 'riskNotes', 'improvements'],
              additionalProperties: false
            }
          }
        ],
        tool_choice: { type: 'tool', name: 'analyze_signal' }
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Anthropic API error: ${response.status} - ${errorText}`)
      return null
    }

    const data = await response.json()

    // Extract tool_use block (Anthropic forces it via tool_choice)
    const toolUse = data.content?.[0]
    if (!toolUse || toolUse.type !== 'tool_use' || toolUse.name !== 'analyze_signal') {
      console.error('Unexpected AI response format:', JSON.stringify(data))
      return null
    }

    const args = toolUse.input as AIConfirmation

    // Safety: grade 'B' was eliminated, coerce any stray B response to REJECT
    if ((args.grade as string) === 'B') {
      args.approve = false
      args.grade = 'REJECT' as AIConfirmation['grade']
    }

    console.log(`[AI] ${pair}: approve=${args.approve}, grade=${args.grade}, confidence=${args.confidence}`)

    return args

  } catch (error) {
    console.error('Error calling Anthropic API:', error)
    return null
  }
}

// ============= MAIN =============

Deno.serve(async (req) => {
  const startTime = Date.now()
  console.log('generate-signals function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate cron secret
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    
    if (!cronSecret || cronSecret !== expectedSecret) {
      console.error('Invalid or missing cron secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse body
    const body = await req.json()
    const timeframe = body.timeframe as '15m' | '1H'
    const chunk = typeof body.chunk === 'number' ? body.chunk : 0
    const chunks = typeof body.chunks === 'number' && body.chunks > 0 ? body.chunks : 1
    
    if (!timeframe || !['15m', '1H'].includes(timeframe)) {
      return new Response(
        JSON.stringify({ error: 'Invalid timeframe. Use 15m or 1H' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const candleLimit = CANDLE_LIMITS[timeframe]

    // Validate chunk/chunks
    if (chunk < 0 || chunk >= chunks) {
      return new Response(
        JSON.stringify({ error: `Invalid chunk ${chunk} for chunks ${chunks}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing timeframe: ${timeframe}, chunk: ${chunk}/${chunks}`)

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch active pairs
    const { data: pairs, error: pairsError } = await supabase
      .from('allowed_pairs')
      .select('*')
      .eq('is_active', true)
      .order('rank', { ascending: true })

    if (pairsError || !pairs) {
      console.error('Error fetching pairs:', pairsError)
      throw new Error('Failed to fetch pairs')
    }

    console.log(`Found ${pairs.length} active pairs (total)`)

    // Calculate chunk slice
    const total = pairs.length
    const size = Math.ceil(total / chunks)
    const start = chunk * size
    const end = Math.min(start + size, total)
    const pairsSlice = pairs.slice(start, end)

    console.log(`[generate-signals] timeframe=${timeframe} chunk=${chunk}/${chunks} total=${total} processing=${start}-${end} (${pairsSlice.length} pairs)`)

    // === Quick OKX connection test for BTCUSDT (only on chunk 0) ===
    if (chunk === 0) {
      console.log('=== Running OKX connection test for BTCUSDT ===')
      const testKlines = await fetchOKXKlines('BTCUSDT', timeframe, candleLimit)
      if (testKlines) {
        console.log(`=== OKX test SUCCESS: ${testKlines.length} candles ===`)
        console.log(`    First candle: ${new Date(testKlines[0].time).toISOString()}`)
        console.log(`    Last candle: ${new Date(testKlines[testKlines.length - 1].time).toISOString()}`)
      } else {
        console.log('=== OKX test FAILED, will try Bybit fallback ===')
      }
    }

    // ProcessResult interface for structured output
    interface ProcessResult {
      pair: string
      signal?: NormalizedSetup
      error?: string
      aiAnalysis?: {
        grade: string
        confidence: number
        riskNotes: string[]
        improvements: string[]
        suggestedAdjustments?: Record<string, number>
      }
    }

    const results: ProcessResult[] = []

    // === Quick test for normalizeSetupLevels ===
    console.log('=== Testing normalizeSetupLevels ===')
    const testSetup: SignalSetup = {
      setup: 'FVG_TREND',
      direction: 'LONG',
      entry: 100,
      stopLoss: 98,
      takeProfit1: 0, takeProfit2: 0, takeProfit3: 0,
      confidence: 70,
      analysis: 'Test',
      meta: {}
    }
    const normalizedTest = normalizeSetupLevels(testSetup)
    if (normalizedTest) {
      console.log(`Test LONG: R=${normalizedTest.riskR}, TP1=${normalizedTest.takeProfit1} (exp 103), TP2=${normalizedTest.takeProfit2} (exp 105), TP3=${normalizedTest.takeProfit3} (exp 108)`)
    }
    const testSetupShort: SignalSetup = {
      setup: 'FVG_TREND',
      direction: 'SHORT',
      entry: 100,
      stopLoss: 102,
      takeProfit1: 0, takeProfit2: 0, takeProfit3: 0,
      confidence: 70,
      analysis: 'Test',
      meta: {}
    }
    const normalizedTestShort = normalizeSetupLevels(testSetupShort)
    if (normalizedTestShort) {
      console.log(`Test SHORT: R=${normalizedTestShort.riskR}, TP1=${normalizedTestShort.takeProfit1} (exp 97), TP2=${normalizedTestShort.takeProfit2} (exp 95), TP3=${normalizedTestShort.takeProfit3} (exp 92)`)
    }
    console.log('=== End normalizeSetupLevels test ===')

    for (const pair of pairsSlice) {
      try {
        console.log(`Processing pair: ${pair.symbol}`)
        
        // Fetch candles from OKX (fallback: Bybit)
        const klineData = await fetchKlines(pair.symbol, timeframe, candleLimit)

        if (!klineData || klineData.length === 0) {
          console.error(`Failed to fetch klines for ${pair.symbol}`)
          results.push({ pair: pair.symbol, error: 'All market data APIs failed (Bybit + OKX)' })
          continue
        }

        console.log(`[${pair.symbol}] Using ${klineData.length} candles`)

        // Transform to internal Candle format
        const candles: Candle[] = klineData.map(k => ({
          open_time: k.time,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume
        }))

        // Upsert candles to database
        const candlesToInsert = candles.map(c => ({
          pair_id: pair.id,
          timeframe,
          open_time: new Date(c.open_time).toISOString(),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume
        }))

        const { error: upsertError } = await supabase
          .from('candles')
          .upsert(candlesToInsert, { onConflict: 'pair_id,timeframe,open_time' })

        if (upsertError) {
          console.error(`Error upserting candles for ${pair.symbol}:`, upsertError)
        }

        // Calculate indicators
        const closePrices = candles.map(c => c.close)
        const ema50 = calculateEMA(closePrices, 50)
        const ema200 = calculateEMA(closePrices, 200)
        const rsi = calculateRSI(closePrices, 14)
        const atr = calculateATR(candles, 14)
        
        // Find patterns
        const swings = findSwingPoints(candles)
        const orderBlocks = findOrderBlocks(candles)
        const fvgs = findFVGs(candles)
        const trend = identifyTrend(ema50, ema200, candles.length - 1)
        const bos = detectBOS(candles, swings)

        // Analyze all setups
        const setups: (SignalSetup | null)[] = [
          analyzeSetup1_SweepOB(candles, swings, orderBlocks, trend),
          analyzeSetup2_FVGTrend(candles, fvgs, trend, rsi),
          analyzeSetup3_BOSRetest(candles, swings, bos),
          analyzeSetup4_EMABounce(candles, ema50, ema200, trend, rsi),
          analyzeSetup5_VolumeDivergence(candles, swings, orderBlocks, fvgs, rsi)
        ]

        // Find best setup (highest confidence)
        const validSetups = setups.filter((s): s is SignalSetup => s !== null)
        
        if (validSetups.length > 0) {
          // Get best setup by confidence
          const bestSetup = validSetups.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
          )

          // Store original confidence BEFORE any bonus
          const originalConfidence = bestSetup.confidence

          // Check for confluence (multiple setups increase confidence, capped at +20)
          const confluenceBonus = Math.min((validSetups.length - 1) * 10, 20)
          bestSetup.confidence = Math.min(100, bestSetup.confidence + confluenceBonus)

          // Pre-filter: skip AI call for low-confidence setups (cost optimization)
          if (bestSetup.confidence < 60) {
            console.log(`[SKIP] ${pair.symbol} - confidence ${bestSetup.confidence}% < 60`)
            results.push({ pair: pair.symbol, error: 'Low confidence' })
            continue
          }

          // === NORMALIZE LEVELS (TP1=1.5R, TP2=2.5R, TP3=4R) ===
          const normalized = normalizeSetupLevels(bestSetup)
          
          if (!normalized) {
            console.warn(`[${pair.symbol}] Invalid risk (R=0), skipping`)
            results.push({ pair: pair.symbol, error: 'Invalid risk (R=0)' })
            continue
          }

          console.log(`[Normalize] ${pair.symbol}: R=${formatPrice(normalized.riskR)}, TP1=1.5R, TP2=2.5R, TP3=4R`)

          // Get current indicator values for AI
          const currentEma50 = ema50[candles.length - 1] || 0
          const currentEma200 = ema200[candles.length - 1] || 0
          const currentRsi = rsi[rsi.length - 1] || 50
          const currentAtr = Number.isFinite(atr[atr.length - 1]) ? atr[atr.length - 1] : 0

          // === CONFIRM WITH AI (Senior Analyst) ===
          console.log(`[AI] Requesting analysis for ${pair.symbol} ${normalized.setup}...`)
          const aiConfirmation = await confirmWithAI(
            pair.symbol,
            timeframe,
            normalized,
            candles,
            currentEma50,
            currentEma200,
            currentRsi,
            currentAtr,
            trend
          )

          // === PROCESS AI RESPONSE ===
          if (aiConfirmation) {
            if (!aiConfirmation.approve) {
              // AI REJECTED - Log structured feedback, don't insert signal
              console.log(`[AI REJECT] ${pair.symbol}: ${aiConfirmation.reason}`)
              console.log(`[AI REJECT] Grade: ${aiConfirmation.grade}, Confidence: ${aiConfirmation.confidence}`)
              const rejectImprovementsText = Array.isArray(aiConfirmation.improvements)
                ? aiConfirmation.improvements.join(', ')
                : (aiConfirmation.improvements || '')
              console.log(`[AI REJECT] Improvements: ${rejectImprovementsText}`)
              
              results.push({ 
                pair: pair.symbol, 
                error: `AI rejected: ${aiConfirmation.reason}`,
                aiAnalysis: {
                  grade: aiConfirmation.grade,
                  confidence: aiConfirmation.confidence,
                  riskNotes: aiConfirmation.riskNotes,
                  improvements: aiConfirmation.improvements,
                  suggestedAdjustments: aiConfirmation.suggestedAdjustments as Record<string, number> | undefined
                }
              })
              continue // Skip to next pair
            }

            // === AI APPROVED - Insert signal ===
            console.log(`[AI APPROVE] ${pair.symbol}: grade=${aiConfirmation.grade}, confidence=${aiConfirmation.confidence}`)

            // Build premium English analysis block
            // Anthropic sometimes returns riskNotes/improvements as string instead of array
            const riskNotesText = Array.isArray(aiConfirmation.riskNotes)
              ? aiConfirmation.riskNotes.map(r => `- ${r}`).join('\n')
              : (aiConfirmation.riskNotes || '')
            const improvementsText = Array.isArray(aiConfirmation.improvements)
              ? aiConfirmation.improvements.map(i => `- ${i}`).join('\n')
              : (aiConfirmation.improvements || '')
            const riskNotesBlock = riskNotesText ? `\nRisks:\n${riskNotesText}` : ''
            const improvementsBlock = improvementsText ? `\nImprovements:\n${improvementsText}` : ''
            const premiumAnalysis = `Reason: ${aiConfirmation.reason}${riskNotesBlock}${improvementsBlock}`

            const { error: insertError } = await supabase
              .from('signals')
              .insert({
                pair_id: pair.id,
                timeframe,
                direction: normalized.direction,
                grade: aiConfirmation.grade,
                setup: normalized.setup,
                entry_price: normalized.entry,
                stop_loss: normalized.stopLoss,
                take_profit_1: normalized.takeProfit1,
                take_profit_2: normalized.takeProfit2,
                take_profit_3: normalized.takeProfit3,
                analysis: premiumAnalysis,
                status: 'active',
                confidence: aiConfirmation.confidence,
                meta: {
                  ...normalized.meta,
                  ai_confirmed: true,
                  ai_grade: aiConfirmation.grade,
                  ai_confidence: aiConfirmation.confidence,
                  riskNotes: aiConfirmation.riskNotes,
                  improvements: aiConfirmation.improvements,
                  suggestedAdjustments: aiConfirmation.suggestedAdjustments,
                  riskR: normalized.riskR,
                  rrRatios: normalized.rrRatios,
                  confluence_count: validSetups.length,
                  original_confidence: originalConfidence,
                  setup_type: normalized.setup
                },
                // 15m: 1h expiry (4 ciclos × 15min) | 1H: 4h expiry (4 ciclos × 1h)
                expires_at: new Date(Date.now() + (timeframe === '15m' ? 1 : 4) * 60 * 60 * 1000).toISOString()
              })

            if (insertError) {
              // Unique constraint violation means there's already an active signal
              if (insertError.code === '23505') {
                console.log(`Active signal already exists for ${pair.symbol} ${timeframe}`)
                results.push({ pair: pair.symbol, error: 'Active signal already exists' })
              } else {
                console.error(`Error inserting signal for ${pair.symbol}:`, insertError)
                results.push({ pair: pair.symbol, error: insertError.message })
              }
            } else {
              console.log(`[SIGNAL] ${pair.symbol}: ${normalized.direction} (${normalized.setup}) grade=${aiConfirmation.grade}`)
              results.push({ pair: pair.symbol, signal: normalized })
            }
          } else {
            // AI not available - skip signal (be conservative)
            console.log(`[AI] Skipping ${pair.symbol} - AI confirmation unavailable`)
            results.push({ pair: pair.symbol, error: 'AI confirmation unavailable' })
          }
        } else {
          results.push({ pair: pair.symbol, error: 'No valid setup found' })
        }

      } catch (pairError) {
        console.error(`Error processing ${pair.symbol}:`, pairError)
        results.push({ pair: pair.symbol, error: String(pairError) })
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const signalsCreated = results.filter(r => r.signal).length
    const durationMs = Date.now() - startTime
    console.log(`Completed: chunk ${chunk}/${chunks}, ${signalsCreated} signals created out of ${pairsSlice.length} pairs in ${durationMs}ms`)

    return new Response(
      JSON.stringify({
        success: true,
        timeframe,
        chunk,
        chunks,
        processed: pairsSlice.length,
        signalsCreated,
        durationMs,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-signals:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
