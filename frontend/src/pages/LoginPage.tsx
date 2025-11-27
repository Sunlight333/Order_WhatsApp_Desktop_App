import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Loader2, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const { t } = useTranslation();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError(t('login.enterBoth'));
      return;
    }

    try {
      await login({ username: username.trim(), password });
      toast.success(t('login.loginSuccess'));
      navigate('/orders');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        t('login.loginFailed');
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <LogIn size={48} />
          </div>
          <h1>{t('login.title')}</h1>
          <p>{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">{t('login.username')}</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('login.username')}
              disabled={isLoading}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('login.password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.password')}
              disabled={isLoading}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="spinner" size={20} />
                {t('common.loading')}
              </>
            ) : (
              <>
                <LogIn size={20} />
                {t('login.loginButton')}
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-hint">
            Default credentials: <strong>admin</strong> / <strong>admin123</strong>
          </p>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="btn-secondary"
            style={{
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <Settings size={18} />
            Configure Application Settings
          </button>
        </div>
      </div>
    </div>
  );
}

