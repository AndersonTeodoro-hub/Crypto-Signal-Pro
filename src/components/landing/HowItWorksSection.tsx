import { Card, CardContent } from '@/components/ui/card';
import { Search, Brain, Bell } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function HowItWorksSection() {
  const { t } = useLanguage();

  const steps = [
    {
      icon: Search,
      title: t('howItWorks.step1Title'),
      description: t('howItWorks.step1Description'),
      step: '01',
    },
    {
      icon: Brain,
      title: t('howItWorks.step2Title'),
      description: t('howItWorks.step2Description'),
      step: '02',
    },
    {
      icon: Bell,
      title: t('howItWorks.step3Title'),
      description: t('howItWorks.step3Description'),
      step: '03',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('howItWorks.title')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="glass border-border/50 relative overflow-hidden group hover:border-primary/50 transition-all duration-300">
              <CardContent className="p-8">
                <span className="absolute top-4 right-4 text-6xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors">
                  {step.step}
                </span>
                
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-6">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>

                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
