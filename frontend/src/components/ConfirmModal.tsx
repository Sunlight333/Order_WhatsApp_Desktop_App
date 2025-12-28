import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import '../styles/modal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
  hideCancel?: boolean;
  customContent?: ReactNode;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  type = 'warning',
  loading = false,
  hideCancel = false,
  customContent,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const { t } = useTranslation();
  const resolvedConfirmText = confirmText ?? t('common.confirm');
  const resolvedCancelText = cancelText ?? t('common.cancel');

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle size={24} className="modal-icon danger" />;
      case 'warning':
        return <AlertTriangle size={24} className="modal-icon warning" />;
      case 'info':
        return <Info size={24} className="modal-icon info" />;
      case 'success':
        return <CheckCircle size={24} className="modal-icon success" />;
      default:
        return null;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'btn-danger';
      case 'warning':
        return 'btn-warning';
      case 'success':
        return 'btn-success';
      default:
        return 'btn-primary';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            {getIcon()}
            <h3>{title}</h3>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {customContent ? (
            <div className="modal-custom-content">{customContent}</div>
          ) : message ? (
            <div className="modal-message">{message}</div>
          ) : null}
        </div>
        <div className="modal-actions">
          {!hideCancel && (
            <button
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              {resolvedCancelText}
            </button>
          )}
          <button
            className={`btn ${getButtonClass()}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner-small"></span>
                {t('common.processing')}
              </span>
            ) : (
              resolvedConfirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
