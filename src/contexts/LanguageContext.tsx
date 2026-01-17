import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Language, localeMap } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app_lang';

function detectBrowserLanguage(): Language {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('pt')) return 'pt';
  if (browserLang.startsWith('es')) return 'es';
  return 'en';
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let value: unknown = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  
  return typeof value === 'string' ? value : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ['en', 'pt', 'es'].includes(stored)) {
      return stored as Language;
    }
    // Fall back to browser detection
    return detectBrowserLanguage();
  });

  // Load language from profile when user logs in
  useEffect(() => {
    const loadUserLanguage = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('language')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data?.language && ['en', 'pt', 'es'].includes(data.language)) {
          setLanguageState(data.language as Language);
          localStorage.setItem(STORAGE_KEY, data.language);
        }
      } catch (error) {
        console.error('Error loading user language:', error);
      }
    };

    loadUserLanguage();
  }, [user]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);

    // Update profile if user is logged in
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ language: lang })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error saving user language:', error);
      }
    }
  }, [user]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    // Try current language
    let value = getNestedValue(translations[language] as Record<string, unknown>, key);
    
    // Fallback to English
    if (!value && language !== 'en') {
      value = getNestedValue(translations.en as Record<string, unknown>, key);
    }
    
    // Final fallback: return the key itself
    if (!value) {
      console.warn(`Missing translation key: ${key}`);
      return key;
    }

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value!.replace(`{${paramKey}}`, String(paramValue));
      });
    }

    return value;
  }, [language]);

  const locale = localeMap[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, locale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
