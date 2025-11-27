import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  const currentLang = i18n.language === 'es' ? 'ES' : 'EN';

  return (
    <button
      className="language-toggle"
      onClick={toggleLanguage}
      title={i18n.language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontSize: '0.875rem',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-secondary)';
      }}
    >
      <Globe size={16} />
      <span>{currentLang}</span>
    </button>
  );
}

