import { useState, useEffect } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../styles/modal.css';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (message: string) => void;
  phoneNumber: string;
  initialMessage: string;
  loading?: boolean;
}

export default function WhatsAppModal({
  isOpen,
  onClose,
  onConfirm,
  phoneNumber,
  initialMessage,
  loading = false,
}: WhatsAppModalProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState(initialMessage);

  // Update message when initialMessage changes
  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(message);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <MessageSquare size={24} className="modal-icon info" />
            <h3>{t('orderDetail.sendWhatsAppTitle')}</h3>
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
          <div className="modal-message">
            <p dangerouslySetInnerHTML={{ __html: t('orderDetail.sendWhatsAppQuestion', { phoneNumber }) }} />
            
            <div style={{ marginTop: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                {t('orderDetail.message')}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('orderDetail.enterYourMessage')}
                className="form-input form-textarea"
                rows={4}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9375rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  transition: 'all 0.2s ease',
                }}
                disabled={loading}
                onFocus={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
              <small style={{ 
                display: 'block', 
                marginTop: '0.5rem', 
                fontSize: '0.75rem', 
                color: 'var(--text-secondary)' 
              }}>
                {t('orderDetail.editMessageBeforeSending')}
              </small>
            </div>
            
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: t('orderDetail.whatsAppStatusUpdate') }} />
          </div>
        </div>
        <div className="modal-actions">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading || !message.trim()}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner-small"></span>
                {t('orderDetail.processing')}
              </span>
            ) : (
              t('orderDetail.openWhatsApp')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

