import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('admin-approve-referral function called')

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
    const { referralId, action, grantPlan = 'basic', durationDays = 7, notes = null } = body

    // Validate inputs
    if (!referralId || typeof referralId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid referralId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Valid action (approve/reject) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the referral
    const { data: referral, error: referralError } = await serviceClient
      .from('referrals')
      .select('*')
      .eq('id', referralId)
      .single()

    if (referralError || !referral) {
      console.log('Referral not found:', referralId)
      return new Response(
        JSON.stringify({ error: 'Referral not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (referral.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Referral already ${referral.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'reject') {
      // Update referral status to rejected
      const { error: updateError } = await serviceClient
        .from('referrals')
        .update({ 
          status: 'rejected',
          notes: notes || 'Rejected by admin'
        })
        .eq('id', referralId)

      if (updateError) {
        console.error('Error rejecting referral:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to reject referral' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Referral ${referralId} rejected`)
      return new Response(
        JSON.stringify({ success: true, message: 'Referral rejected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Approve action: create grant for referee and update referral status

    // Calculate expires_at
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()

    // Create access grant for referee
    const { error: grantError } = await serviceClient
      .from('access_grants')
      .insert({
        user_id: referral.referee_user_id,
        plan: grantPlan,
        source: 'referral',
        expires_at: expiresAt,
        notes: `Referral reward from ${referral.referrer_user_id}`
      })

    if (grantError) {
      console.error('Error creating grant:', grantError)
      return new Response(
        JSON.stringify({ error: 'Failed to create access grant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update referral status to rewarded
    const { error: updateError } = await serviceClient
      .from('referrals')
      .update({ 
        status: 'rewarded',
        approved_at: new Date().toISOString(),
        notes: notes || `Granted ${grantPlan} for ${durationDays} days`
      })
      .eq('id', referralId)

    if (updateError) {
      console.error('Error updating referral:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update referral status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Referral ${referralId} approved: ${grantPlan} for ${durationDays} days`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Referral approved: ${grantPlan} access granted for ${durationDays} days` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-approve-referral:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
