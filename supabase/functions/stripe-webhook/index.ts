import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

// Map price IDs to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1SqayI33pOgyOP2HGb6ZrXey': 'basic', // Basic monthly $39
  'price_1Sqb9C33pOgyOP2HTB7Zn8ta': 'pro',   // Pro monthly $99
}

Deno.serve(async (req) => {
  console.log('stripe-webhook function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!stripeSecretKey) {
      console.error('Stripe secret key not configured')
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    let event: Stripe.Event

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // For development without webhook secret
      event = JSON.parse(body)
      console.warn('Webhook signature not verified (no secret configured)')
    }

    console.log(`Processing event: ${event.type}`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const plan = session.metadata?.plan

        console.log(`Checkout completed for user ${userId}, plan: ${plan}`)

        if (userId && plan) {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              plan: plan,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)

          if (error) {
            console.error('Error updating profile:', error)
          } else {
            console.log(`Updated user ${userId} to plan ${plan}`)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id
        
        if (userId) {
          // Get the price ID from the subscription
          const priceId = subscription.items.data[0]?.price?.id
          const plan = priceId ? PRICE_TO_PLAN[priceId] : null

          if (plan) {
            const { error } = await supabase
              .from('profiles')
              .update({ 
                plan: plan,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)

            if (error) {
              console.error('Error updating profile:', error)
            } else {
              console.log(`Subscription updated for user ${userId} to plan ${plan}`)
            }
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id
        
        if (userId) {
          // Downgrade to free plan
          const { error } = await supabase
            .from('profiles')
            .update({ 
              plan: 'free',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)

          if (error) {
            console.error('Error downgrading profile:', error)
          } else {
            console.log(`Downgraded user ${userId} to free plan`)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in stripe-webhook:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
