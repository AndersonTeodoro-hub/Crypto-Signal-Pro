import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('create-referral function called')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token not provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Create client with user's auth to verify JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify JWT and get user
    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    console.log(`Processing referral for user ${userId}`)

    // Parse body
    const body = await req.json()
    const refCode = body.refCode as string

    if (!refCode || typeof refCode !== 'string' || refCode.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create service role client for database operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Find referrer by referral_code
    const { data: referrer, error: referrerError } = await serviceClient
      .from('profiles')
      .select('user_id, referral_code')
      .eq('referral_code', refCode.toUpperCase())
      .single()

    if (referrerError || !referrer) {
      console.log('Referrer not found for code:', refCode)
      return new Response(
        JSON.stringify({ error: 'Referral code not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if trying to refer self
    if (referrer.user_id === userId) {
      console.log('User tried to refer themselves')
      return new Response(
        JSON.stringify({ error: 'Cannot use your own referral code', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already has a referrer
    const { data: currentProfile } = await serviceClient
      .from('profiles')
      .select('referred_by')
      .eq('user_id', userId)
      .single()

    if (currentProfile?.referred_by) {
      console.log('User already has a referrer')
      return new Response(
        JSON.stringify({ error: 'Already referred by another user', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if referral already exists
    const { data: existingReferral } = await serviceClient
      .from('referrals')
      .select('id')
      .eq('referee_user_id', userId)
      .single()

    if (existingReferral) {
      console.log('Referral already exists for this user')
      return new Response(
        JSON.stringify({ error: 'Referral already exists', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update profile with referred_by
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update({ referred_by: referrer.user_id })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert referral record
    const { error: insertError } = await serviceClient
      .from('referrals')
      .insert({
        referrer_user_id: referrer.user_id,
        referee_user_id: userId,
        status: 'pending'
      })

    if (insertError) {
      console.error('Error creating referral:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create referral record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Referral created: ${referrer.user_id} -> ${userId}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Referral recorded successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-referral:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
