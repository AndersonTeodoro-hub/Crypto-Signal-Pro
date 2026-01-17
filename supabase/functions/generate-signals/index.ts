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
  setup: 'SWEEP_OB' | 'FVG_TREND' | 'BOS_RETEST'
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

function analyzeSetup1_SweepOB(candles: Candle[], swings: SwingPoint[], orderBlocks: OrderBlock[]): SignalSetup | null {
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
      confidence: 75,
      analysis: `Liquidity Sweep detectado em swing low (${sweep.swing.price.toFixed(2)}). Order Block bullish identificado entre ${ob.low.toFixed(2)} - ${ob.high.toFixed(2)}. Aguardando retorno ao OB para entrada LONG.`,
      meta: { sweep, orderBlock: ob }
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
      confidence: 75,
      analysis: `Liquidity Sweep detectado em swing high (${sweep.swing.price.toFixed(2)}). Order Block bearish identificado entre ${ob.low.toFixed(2)} - ${ob.high.toFixed(2)}. Aguardando retorno ao OB para entrada SHORT.`,
      meta: { sweep, orderBlock: ob }
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

function getGrade(confidence: number): 'A+' | 'A' | 'B+' | 'B' {
  if (confidence >= 80) return 'A+'
  if (confidence >= 65) return 'A'
  if (confidence >= 50) return 'B+'
  return 'B'
}

// ============= AI CONFIRMATION =============

interface AIConfirmation {
  confirmed: boolean
  confidence_adjustment: number
  analysis: string
  risk_notes: string
}

const AI_SYSTEM_PROMPT = `Você é um analista de trading especializado em Smart Money Concepts (SMC) e Price Action.

Sua função é analisar setups de trading detectados algoritmicamente e:
1. CONFIRMAR ou REJEITAR o setup baseado no contexto de mercado
2. AJUSTAR o score de confiança (-20 a +20 pontos)
3. GERAR uma análise concisa e profissional em português
4. IDENTIFICAR riscos específicos do setup

Critérios de validação:
- Tendência alinhada com a direção do sinal
- Estrutura de mercado clara (Higher Highs/Higher Lows ou vice-versa)
- Volume confirmatório
- RSI não em extremos contrários
- Distância adequada entre entry e SL (mínimo 0.5%, máximo 2%)
- Risk/Reward mínimo de 1:1.5

SEJA RIGOROSO: Rejeite setups fracos ou com baixa probabilidade.`

async function confirmWithAI(
  pair: string,
  timeframe: string,
  setup: SignalSetup,
  candles: Candle[],
  ema50Value: number,
  ema200Value: number,
  rsiValue: number,
  trend: string
): Promise<AIConfirmation | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  
  if (!LOVABLE_API_KEY) {
    console.log('LOVABLE_API_KEY not configured, skipping AI confirmation')
    return null
  }
  
  try {
    // Create candles summary (last 20 candles for context)
    const recentCandles = candles.slice(-20)
    const candlesSummary = recentCandles.map((c, i) => {
      const change = ((c.close - c.open) / c.open * 100).toFixed(2)
      const direction = c.close >= c.open ? '🟢' : '🔴'
      return `${i + 1}. ${direction} O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)} (${change}%)`
    }).join('\n')
    
    const lastPrice = candles[candles.length - 1].close
    const riskPercent = setup.direction === 'LONG' 
      ? ((setup.entry - setup.stopLoss) / setup.entry * 100).toFixed(2)
      : ((setup.stopLoss - setup.entry) / setup.entry * 100).toFixed(2)
    
    const rrRatio = ((setup.takeProfit1 - setup.entry) / (setup.entry - setup.stopLoss)).toFixed(2)
    
    const userPrompt = `Analise este setup de trading:

**Par:** ${pair}
**Timeframe:** ${timeframe}
**Setup Detectado:** ${setup.setup}
**Direção:** ${setup.direction}
**Confiança Atual:** ${setup.confidence}%

**Níveis:**
- Preço Atual: ${lastPrice.toFixed(2)}
- Entry: ${setup.entry.toFixed(2)}
- Stop Loss: ${setup.stopLoss.toFixed(2)} (Risco: ${riskPercent}%)
- TP1: ${setup.takeProfit1.toFixed(2)} | TP2: ${setup.takeProfit2.toFixed(2)} | TP3: ${setup.takeProfit3.toFixed(2)}
- Risk/Reward: 1:${rrRatio}

**Indicadores:**
- EMA 50: ${ema50Value.toFixed(2)}
- EMA 200: ${ema200Value.toFixed(2)}
- RSI (14): ${rsiValue.toFixed(1)}
- Tendência: ${trend.toUpperCase()}

**Análise Algorítmica:**
${setup.analysis}

**Últimos 20 Candles:**
${candlesSummary}

Analise criticamente e use a função confirm_signal para responder.`

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'confirm_signal',
              description: 'Confirma ou rejeita o setup de trading analisado',
              parameters: {
                type: 'object',
                properties: {
                  confirmed: {
                    type: 'boolean',
                    description: 'true se o setup é válido e deve ser executado, false se deve ser rejeitado'
                  },
                  confidence_adjustment: {
                    type: 'integer',
                    description: 'Ajuste na confiança: -20 a +20 pontos. Positivo aumenta, negativo diminui'
                  },
                  analysis: {
                    type: 'string',
                    description: 'Análise profissional do setup em português (máximo 3 frases). Explique os pontos fortes e fracos.'
                  },
                  risk_notes: {
                    type: 'string',
                    description: 'Observações de risco específicas para este trade (níveis a monitorar, eventos, etc)'
                  }
                },
                required: ['confirmed', 'confidence_adjustment', 'analysis', 'risk_notes'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'confirm_signal' } }
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`AI Gateway error: ${response.status} - ${errorText}`)
      return null
    }
    
    const data = await response.json()
    
    // Extract tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
    if (!toolCall || toolCall.function.name !== 'confirm_signal') {
      console.error('Unexpected AI response format:', JSON.stringify(data))
      return null
    }
    
    const args = JSON.parse(toolCall.function.arguments) as AIConfirmation
    console.log(`AI Confirmation for ${pair}: confirmed=${args.confirmed}, adjustment=${args.confidence_adjustment}`)
    
    return args
    
  } catch (error) {
    console.error('Error calling AI Gateway:', error)
    return null
  }
}

// ============= MAIN =============

Deno.serve(async (req) => {
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
    const timeframe = body.timeframe as '1H' | '4H'
    
    if (!timeframe || !['1H', '4H'].includes(timeframe)) {
      return new Response(
        JSON.stringify({ error: 'Invalid timeframe. Use 1H or 4H' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing timeframe: ${timeframe}`)

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

    console.log(`Found ${pairs.length} active pairs`)

    const results: { pair: string, signal?: SignalSetup, error?: string }[] = []
    const binanceInterval = timeframe === '1H' ? '1h' : '4h'

    for (const pair of pairs) {
      try {
        console.log(`Processing pair: ${pair.symbol}`)
        
        // Fetch candles from Binance
        const binanceSymbol = pair.symbol.replace('/', '')
        const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=220`
        
        const response = await fetch(url)
        if (!response.ok) {
          console.error(`Binance API error for ${pair.symbol}: ${response.status}`)
          results.push({ pair: pair.symbol, error: `Binance API error: ${response.status}` })
          continue
        }
        
        const klines = await response.json()
        
        // Transform to candles
        const candles: Candle[] = klines.map((k: unknown[]) => ({
          open_time: k[0] as number,
          open: parseFloat(k[1] as string),
          high: parseFloat(k[2] as string),
          low: parseFloat(k[3] as string),
          close: parseFloat(k[4] as string),
          volume: parseFloat(k[5] as string)
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
        
        // Find patterns
        const swings = findSwingPoints(candles)
        const orderBlocks = findOrderBlocks(candles)
        const fvgs = findFVGs(candles)
        const trend = identifyTrend(ema50, ema200, candles.length - 1)
        const bos = detectBOS(candles, swings)

        // Analyze all setups
        const setups: (SignalSetup | null)[] = [
          analyzeSetup1_SweepOB(candles, swings, orderBlocks),
          analyzeSetup2_FVGTrend(candles, fvgs, trend, rsi),
          analyzeSetup3_BOSRetest(candles, swings, bos)
        ]

        // Find best setup (highest confidence)
        const validSetups = setups.filter((s): s is SignalSetup => s !== null)
        
        if (validSetups.length > 0) {
          const bestSetup = validSetups.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
          )

          // Check for confluence (multiple setups increase confidence)
          const confluenceBonus = (validSetups.length - 1) * 10
          bestSetup.confidence = Math.min(100, bestSetup.confidence + confluenceBonus)

          // Get current indicator values for AI
          const currentEma50 = ema50[candles.length - 1] || 0
          const currentEma200 = ema200[candles.length - 1] || 0
          const currentRsi = rsi[rsi.length - 1] || 50

          // Confirm with AI (Gemini 3)
          console.log(`Requesting AI confirmation for ${pair.symbol} ${bestSetup.setup}...`)
          const aiConfirmation = await confirmWithAI(
            pair.symbol,
            timeframe,
            bestSetup,
            candles,
            currentEma50,
            currentEma200,
            currentRsi,
            trend
          )

          // Process AI response
          let finalConfidence = bestSetup.confidence
          let finalAnalysis = bestSetup.analysis + (confluenceBonus > 0 ? ` [Confluência: ${validSetups.length} setups]` : '')
          let aiConfirmed = true
          let riskNotes = ''

          if (aiConfirmation) {
            if (!aiConfirmation.confirmed) {
              // AI rejected the setup
              console.log(`AI REJECTED setup for ${pair.symbol}: ${aiConfirmation.analysis}`)
              results.push({ 
                pair: pair.symbol, 
                error: `AI rejected: ${aiConfirmation.analysis}` 
              })
              continue // Skip to next pair
            }

            // AI confirmed - apply adjustments
            aiConfirmed = true
            finalConfidence = Math.min(100, Math.max(0, bestSetup.confidence + aiConfirmation.confidence_adjustment))
            finalAnalysis = aiConfirmation.analysis
            riskNotes = aiConfirmation.risk_notes
            
            console.log(`AI CONFIRMED ${pair.symbol}: adjustment=${aiConfirmation.confidence_adjustment}, new confidence=${finalConfidence}`)
          }

          // Insert signal with AI-enhanced data
          const { error: insertError } = await supabase
            .from('signals')
            .insert({
              pair_id: pair.id,
              timeframe,
              direction: bestSetup.direction,
              grade: getGrade(finalConfidence),
              entry_price: bestSetup.entry,
              stop_loss: bestSetup.stopLoss,
              take_profit_1: bestSetup.takeProfit1,
              take_profit_2: bestSetup.takeProfit2,
              take_profit_3: bestSetup.takeProfit3,
              analysis: finalAnalysis,
              status: 'active',
              setup: bestSetup.setup,
              confidence: finalConfidence,
              meta: {
                ...bestSetup.meta,
                ai_confirmed: aiConfirmed,
                risk_notes: riskNotes,
                confluence_count: validSetups.length,
                original_confidence: bestSetup.confidence - confluenceBonus
              },
              expires_at: new Date(Date.now() + (timeframe === '1H' ? 4 : 16) * 60 * 60 * 1000).toISOString()
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
            console.log(`Signal created for ${pair.symbol}: ${bestSetup.direction} (${bestSetup.setup}) [AI ${aiConfirmed ? 'confirmed' : 'pending'}]`)
            results.push({ pair: pair.symbol, signal: bestSetup })
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
    console.log(`Completed: ${signalsCreated} signals created out of ${pairs.length} pairs`)

    return new Response(
      JSON.stringify({
        success: true,
        timeframe,
        processed: pairs.length,
        signalsCreated,
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