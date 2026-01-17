import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg gradient-primary">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold gradient-text">CSP</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {t('hero.subtitle').slice(0, 80)}...
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.product')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#how-it-works" className="hover:text-foreground transition-colors">{t('nav.howItWorks')}</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">{t('nav.features')}</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">{t('nav.pricing')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('footer.support')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.helpCenter')}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.contact')}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.termsOfService')}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.privacyPolicy')}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Cookies</a></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ <strong>{t('footer.disclaimer')}</strong>
          </p>
          <p className="text-xs text-muted-foreground text-center mt-4">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
