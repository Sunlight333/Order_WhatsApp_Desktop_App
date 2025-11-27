import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../ThemeToggle';
import LanguageToggle from '../LanguageToggle';
import toast from 'react-hot-toast';
import { configService } from '../../services/config.service';

// Helper function to get full avatar URL
function getAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  const serverBaseUrl = configService.getServerBaseUrl();
  return `${serverBaseUrl}${avatarPath}`;
}

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t('header.logoutSuccess'));
      navigate('/login');
    } catch (error) {
      toast.error(t('header.logoutFailed'));
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">
          <img 
            src="/assets/images/logo.png" 
            alt="Logo" 
            className="logo-icon"
          />
          <h1 className="logo-text">{t('app.title')}</h1>
        </div>
      </div>

      <div className="header-right">
        <LanguageToggle />
        <ThemeToggle />
        
        <div className="user-menu">
          <div className="user-info">
            {user?.avatar ? (
              <img 
                src={getAvatarUrl(user.avatar) || ''} 
                alt={user.username}
                className="header-user-avatar"
              />
            ) : (
              <User size={20} />
            )}
            <span className="username">{user?.username}</span>
            {user?.role === 'SUPER_ADMIN' && (
              <span className="user-badge">{t('header.admin')}</span>
            )}
          </div>
          
          <button 
            className="logout-button"
            onClick={handleLogout}
            title={t('header.logout')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

