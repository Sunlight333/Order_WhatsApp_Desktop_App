import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, X } from 'lucide-react';
import '../styles/password-modal.css';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title: string;
  message?: string;
  placeholder?: string;
  required?: boolean;
  loading?: boolean;
}

export default function PasswordModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  placeholder = 'Enter password (optional)',
  required = false,
  loading = false,
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (required && !password.trim()) {
      return; // Don't proceed if password is required but empty
    }
    onConfirm(password.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="password-modal-overlay" onClick={onClose}>
      <div className="password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="password-modal-header">
          <div className="password-modal-title">
            <Lock size={20} />
            <h3>{title}</h3>
          </div>
          <button className="password-modal-close" onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <div className="password-modal-body">
          {message && <p className="password-modal-message">{message}</p>}
          
          <div className="password-input-group">
            <label>
              Password {required && <span className="required">*</span>}
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={placeholder}
                className="password-input"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {!required && (
              <small className="password-hint">
                Leave empty for no encryption
              </small>
            )}
          </div>
        </div>

        <div className="password-modal-footer">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={loading || (required && !password.trim())}
          >
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

