import { Card, CardContent } from '@/components/ui/card';
import { 
  Zap, 
  Shield, 
  Clock, 
  BarChart3, 
  Target, 
  Smartphone 
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Sinais em Tempo Real',
    description: 'Receba alertas instantâneos assim que uma oportunidade é identificada.',
  },
  {
    icon: Shield,
    title: 'Gestão de Risco',
    description: 'Cada sinal inclui stop loss e múltiplos níveis de take profit.',
  },
  {
    icon: Clock,
    title: 'Múltiplos Timeframes',
    description: 'Análise em 1H e 4H para diferentes estratégias de trading.',
  },
  {
    icon: BarChart3,
    title: 'Análise Técnica IA',
    description: 'Algoritmos avançados analisam padrões e indicadores automaticamente.',
  },
  {
    icon: Target,
    title: 'Alta Precisão',
    description: 'Sinais baseados em múltiplos indicadores para maior assertividade.',
  },
  {
    icon: Smartphone,
    title: 'Acesso Mobile',
    description: 'Plataforma responsiva para acompanhar sinais de qualquer lugar.',
  },
];

export function FeaturesSection() {
  return (
    <section id="recursos" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Recursos <span className="gradient-text">Poderosos</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tudo que você precisa para tomar decisões de trading mais informadas.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="glass border-border/50 hover:border-primary/50 transition-all duration-300 group"
            >
              <CardContent className="p-6">
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
