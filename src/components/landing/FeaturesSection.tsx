import { Card, CardContent } from '@/components/ui/card';
import { 
  Zap, 
  Shield, 
  Clock, 
  BarChart3, 
  Target, 
  Smartphone 
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function FeaturesSection() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Zap,
      title: t('features.feature1Title'),
      description: t('features.feature1Description'),
    },
    {
      icon: Shield,
      title: t('features.feature3Title'),
      description: t('features.feature3Description'),
    },
    {
      icon: Clock,
      title: t('features.feature2Title'),
      description: t('features.feature2Description'),
    },
    {
      icon: BarChart3,
      title: t('features.feature1Title'),
      description: t('features.feature1Description'),
    },
    {
      icon: Target,
      title: t('features.feature5Title'),
      description: t('features.feature5Description'),
    },
    {
      icon: Smartphone,
      title: t('features.feature6Title'),
      description: t('features.feature6Description'),
    },
  ];

  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('features.title')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('features.subtitle')}
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
