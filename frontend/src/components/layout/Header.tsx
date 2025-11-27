import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../ThemeToggle';
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

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
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
          <h1 className="logo-text">Gestión de Pedidos</h1>
        </div>
      </div>

      <div className="header-right">
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
              <span className="user-badge">Admin</span>
            )}
          </div>
          
          <button 
            className="logout-button"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

