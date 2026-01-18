import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { CryptoTicker } from '@/components/landing/CryptoTicker';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
