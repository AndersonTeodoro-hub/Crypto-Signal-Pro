import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HeroSection() {
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
              🚀 Powered by AI
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Sinais de <span className="gradient-text">Crypto Trading</span> com Precisão de IA
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Receba sinais de trading precisos para os principais pares de criptomoedas, 
              analisados por inteligência artificial avançada em tempo real.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link to="/auth/register">
                <Button size="lg" className="gradient-primary text-white w-full sm:w-auto">
                  Começar Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#como-funciona">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Como Funciona
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-10 justify-center md:justify-start">
              <div>
                <p className="text-2xl font-bold gradient-text">50+</p>
                <p className="text-sm text-muted-foreground">Pares Disponíveis</p>
              </div>
              <div>
                <p className="text-2xl font-bold gradient-text">24/7</p>
                <p className="text-sm text-muted-foreground">Monitoramento</p>
              </div>
              <div>
                <p className="text-2xl font-bold gradient-text">Real-time</p>
                <p className="text-sm text-muted-foreground">Alertas</p>
              </div>
            </div>
          </div>

          {/* Right Content - Signal Mockup */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-accent/40 rounded-2xl blur-2xl transform scale-110" />
              
              {/* Signal Card */}
              <div className="glass rounded-2xl p-6 relative animate-float border border-success/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/20">
                      <TrendingUp className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">BTC/USDT</h3>
                      <p className="text-sm text-muted-foreground">Bitcoin</p>
                    </div>
                  </div>
                  <Badge className="bg-success/20 text-success border-success/30">
                    COMPRA
                  </Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entrada</span>
                    <span className="font-mono">$67,450.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stop Loss</span>
                    <span className="font-mono text-destructive">$66,200.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Take Profit</span>
                    <span className="font-mono text-success">$70,000.00</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Badge variant="outline">1H</Badge>
                  <span className="text-sm text-muted-foreground">Grade: A+</span>
                </div>
              </div>

              {/* Secondary Card */}
              <div className="absolute -bottom-6 -left-6 glass rounded-xl p-4 border border-destructive/30 animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <span className="font-semibold">ETH/USDT</span>
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">
                    VENDA
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
