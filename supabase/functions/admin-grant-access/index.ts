import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('admin-grant-access function called')

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

    // Create service role client for database operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Check if caller is admin
    const { data: callerProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (profileError || !callerProfile) {
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!callerProfile.is_admin) {
      console.log(`Access denied for user ${user.id} - not admin`)
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse body
    const body = await req.json()
    const { email, plan, durationHours, source = 'admin', notes = null } = body

    // Validate inputs
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!plan || !['free', 'basic', 'pro'].includes(plan)) {
      return new Response(
        JSON.stringify({ error: 'Valid plan (free/basic/pro) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!durationHours || typeof durationHours !== 'number' || durationHours <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valid durationHours is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find target user by email
    const { data: targetProfile, error: targetError } = await serviceClient
      .from('profiles')
      .select('user_id, email')
      .eq('email', email.toLowerCase())
      .single()

    if (targetError || !targetProfile) {
      console.log('Target user not found:', email)
      return new Response(
        JSON.stringify({ error: 'User not found with this email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate expires_at
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()

    // Insert access grant
    const { data: grant, error: insertError } = await serviceClient
      .from('access_grants')
      .insert({
        user_id: targetProfile.user_id,
        plan,
        source,
        expires_at: expiresAt,
        notes
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating grant:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create access grant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Access grant created: ${plan} for ${email} until ${expiresAt}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Granted ${plan} access to ${email} for ${durationHours} hours`,
        grant 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-grant-access:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
