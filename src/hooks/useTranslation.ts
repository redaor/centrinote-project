import { useLanguage } from '../contexts/LanguageContext';
import { translations, Translation } from '../i18n/translations';

export function useTranslation() {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  
  return {
    t: (key: keyof Translation) => t[key] || key,
    language
  };
}