import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingDown, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { LatestWinSignalCard } from './LatestWinSignalCard';

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="min-h-screen flex items-center justify-center pt-16 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center md:text-left">
            <Badge variant="secondary" className="mb-6 py-2 px-4 text-sm">
              <Sparkles className="h-4 w-4 mr-2" />
              🚀 {t('hero.badge')}
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {t('hero.title').split('AI').map((part, index, arr) => (
                index < arr.length - 1 ? (
                  <span key={index}>{part}<span className="gradient-text">AI</span></span>
                ) : (
                  <span key={index}>{part}</span>
                )
              ))}
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link to="/auth/register">
                <Button size="lg" className="gradient-primary text-white w-full sm:w-auto">
                  {t('hero.startFree')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  {t('hero.howItWorks')}
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-10 justify-center md:justify-start">
              <div>
                <p className="text-2xl font-bold gradient-text">50+</p>
                <p className="text-sm text-muted-foreground">{t('hero.pairsAvailable')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold gradient-text">24/7</p>
                <p className="text-sm text-muted-foreground">{t('hero.monitoring')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold gradient-text">Real-time</p>
                <p className="text-sm text-muted-foreground">{t('hero.alerts')}</p>
              </div>
            </div>
          </div>

          {/* Right Content - Dynamic Signal Card */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Main Signal Card - Latest Win */}
              <LatestWinSignalCard />

              {/* Secondary Card */}
              <div className="absolute -bottom-6 -left-6 glass rounded-xl p-4 border border-destructive/30 animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <span className="font-semibold">ETH/USDT</span>
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">
                    {t('signal.sell')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
