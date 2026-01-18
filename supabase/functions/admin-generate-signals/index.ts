import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Whitelist de emails admin (temporário)
const ADMIN_EMAILS: string[] = [
  // Adicione emails aqui se necessário
]

Deno.serve(async (req) => {
  console.log('admin-generate-signals function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    const userEmail = user.email || ''

    console.log(`User ${userEmail} requesting signal generation`)

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, email')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isAdmin = profile.is_admin === true
    const isWhitelisted = ADMIN_EMAILS.includes(userEmail) || ADMIN_EMAILS.includes(profile.email || '')

    if (!isAdmin && !isWhitelisted) {
      console.log(`Access denied for ${userEmail} (is_admin: ${profile.is_admin})`)
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse body
    const body = await req.json()
    const timeframe = body.timeframe as '1H' | '4H'
    
    if (!timeframe || !['1H', '4H'].includes(timeframe)) {
      return new Response(
        JSON.stringify({ error: 'Timeframe inválido. Use 1H ou 4H' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Calling generate-signals with timeframe: ${timeframe}`)

    // Call the internal generate-signals function
    const cronSecret = Deno.env.get('CRON_SECRET')
    
    const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret!
      },
      body: JSON.stringify({ timeframe })
    })

    const result = await generateResponse.json()

    if (!generateResponse.ok) {
      console.error('generate-signals error:', result)
      return new Response(
        JSON.stringify({ error: result.error || 'Erro ao gerar sinais' }),
        { status: generateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Signal generation completed: ${result.signalsCreated} signals created`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Geração concluída! ${result.signalsCreated} sinais criados.`,
        ...result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-generate-signals:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})