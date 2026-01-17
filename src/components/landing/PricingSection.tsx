import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PLANS } from '@/lib/plans';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<'basic' | 'pro' | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const plans = [
    {
      key: 'free' as const,
      popular: false,
      cta: 'Start Free',
    },
    {
      key: 'basic' as const,
      popular: true,
      cta: 'Upgrade to Basic',
    },
    {
      key: 'pro' as const,
      popular: false,
      cta: 'Go Pro',
    },
  ];

  const getPrice = (planKey: keyof typeof PLANS) => {
    const plan = PLANS[planKey];
    if (plan.monthlyPrice === 0) return '$0';
    return billingPeriod === 'monthly' 
      ? `$${plan.monthlyPrice}` 
      : `$${plan.annualPrice}`;
  };

  const getPeriodText = (planKey: keyof typeof PLANS) => {
    const plan = PLANS[planKey];
    if (plan.monthlyPrice === 0) return '/mo';
    return billingPeriod === 'monthly' ? '/mo' : '/mo';
  };

  const handleCheckout = async (planKey: 'basic' | 'pro') => {
    // If not logged in, redirect to register
    if (!user) {
      navigate('/auth/register');
      return;
    }

    setCheckoutLoading(planKey);
    
    try {
      const response = await supabase.functions.invoke('create-checkout', {
        body: {
          plan: planKey,
          period: billingPeriod,
          successUrl: `${window.location.origin}/settings?success=true`,
          cancelUrl: `${window.location.origin}/#precos`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Checkout failed');
      }

      const { url } = response.data;
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout Error',
        description: error instanceof Error ? error.message : 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <section id="precos" className="py-24 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Plans & <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your trading level.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              billingPeriod === 'annual'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Annual
            <Badge variant="secondary" className="bg-success/20 text-success text-xs">
              Save ~25%
            </Badge>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => {
            const planData = PLANS[plan.key];
            
            return (
              <Card 
                key={index} 
                className={`glass relative ${
                  plan.popular 
                    ? 'border-primary shadow-lg shadow-primary/20' 
                    : 'border-border/50'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-white">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{planData.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {plan.key === 'free' && 'Perfect to get started'}
                    {plan.key === 'basic' && 'For active traders'}
                    {plan.key === 'pro' && 'For professionals'}
                  </p>
                </CardHeader>
                
                <CardContent className="text-center">
                  <div className="mb-2">
                    <span className="text-4xl font-bold">{getPrice(plan.key)}</span>
                    <span className="text-muted-foreground">{getPeriodText(plan.key)}</span>
                  </div>
                  
                  {billingPeriod === 'annual' && planData.monthlyPrice > 0 && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Billed annually
                    </p>
                  )}
                  {billingPeriod === 'monthly' && <div className="mb-4" />}

                  <ul className="space-y-3 mb-8 text-left">
                    {planData.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-success flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.key === 'free' ? (
                    <Link to="/auth/register">
                      <Button 
                        className="w-full"
                        variant="outline"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      className={`w-full ${
                        plan.popular 
                          ? 'gradient-primary text-white' 
                          : ''
                      }`}
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => handleCheckout(plan.key)}
                      disabled={checkoutLoading !== null}
                    >
                      {checkoutLoading === plan.key ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {plan.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
