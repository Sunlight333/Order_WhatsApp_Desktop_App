import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../ThemeToggle';
import toast from 'react-hot-toast';

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
          <span className="logo-icon">📦</span>
          <h1 className="logo-text">Order Management</h1>
        </div>
      </div>

      <div className="header-right">
        <ThemeToggle />
        
        <div className="user-menu">
          <div className="user-info">
            <User size={20} />
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

