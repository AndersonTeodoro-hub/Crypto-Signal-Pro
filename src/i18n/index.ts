import en from './en.json';
import pt from './pt.json';
import es from './es.json';

export const translations = {
  en,
  pt,
  es,
} as const;

export type Language = keyof typeof translations;
export type TranslationKeys = typeof en;

export const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export const localeMap: Record<Language, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-ES',
};
