import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';

// Get language from localStorage or config, default to Spanish
const getStoredLanguage = async (): Promise<string> => {
  try {
    // First check localStorage (fastest)
    const stored = localStorage.getItem('app_language');
    if (stored && (stored === 'en' || stored === 'es')) {
      return stored;
    }
    
    // Then check config service (may be async, but we'll try sync first)
    // For initial load, we'll use localStorage, config will be loaded later
  } catch (error) {
    // Ignore localStorage errors
  }
  return 'es'; // Default to Spanish
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      es: {
        translation: esTranslations,
      },
    },
    lng: getStoredLanguage(), // Spanish is default (will be 'es' initially)
    fallbackLng: 'es', // Fallback to Spanish if translation missing
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'app_language',
    },
  });

// Listen for language changes and update localStorage
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('app_language', lng);
  } catch (error) {
    // Ignore localStorage errors
  }
});

export default i18n;

