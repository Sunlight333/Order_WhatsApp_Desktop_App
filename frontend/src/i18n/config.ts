import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';

// Get language from localStorage, default to Spanish
// This must be synchronous for i18next init
const getStoredLanguage = (): string => {
  try {
    const stored = localStorage.getItem('app_language');
    if (stored && (stored === 'en' || stored === 'es')) {
      return stored;
    }
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
    lng: getStoredLanguage(), // Spanish is default
    fallbackLng: 'es', // Fallback to Spanish if translation missing
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'querystring', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'app_language',
    },
  });

// Listen for language changes and update localStorage and document title
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('app_language', lng);
    // Update document title when language changes
    document.title = i18n.t('app.title');
  } catch (error) {
    // Ignore localStorage errors
  }
});

// Set initial document title
i18n.on('initialized', () => {
  document.title = i18n.t('app.title');
});

export default i18n;

