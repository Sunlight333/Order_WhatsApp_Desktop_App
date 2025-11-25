# Modern UI Components & Interactions
## Toast Notifications, Modals, Progress Bars, and Image Upload

### Version: 1.0

---

## 1. Toast Notification System

### 1.1 Overview

All event results (success, error, warning, info) must be displayed using **modern toast notifications**. No default browser alerts.

**Key Requirements:**
- ✅ Modern, beautiful design matching seaside theme
- ✅ Smooth animations (fade in/out, slide)
- ✅ Auto-dismiss with configurable duration
- ✅ Manual dismiss option
- ✅ Stack multiple toasts elegantly
- ✅ Position: Top-right corner (default)
- ✅ Non-blocking (doesn't interrupt workflow)

---

### 1.2 Toast Notification Design

#### Visual Design - Charming Seaside Theme

```
┌─────────────────────────────────────────┐
│  ✓ Success                              │
│  Order created successfully             │
│                          [×]            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ⚠ Warning                             │
│  This action cannot be undone           │
│                          [×]            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ✕ Error                               │
│  Failed to connect to server            │
│                          [×]            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ℹ Info                                │
│  Processing your request...             │
│                          [×]            │
└─────────────────────────────────────────┘
```

#### Color Scheme

```css
/* Toast Notification Colors */
.toast-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-left: 4px solid #34d399;
  color: white;
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
}

.toast-error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-left: 4px solid #f87171;
  color: white;
  box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
}

.toast-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-left: 4px solid #fbbf24;
  color: white;
  box-shadow: 0 10px 25px rgba(245, 158, 11, 0.3);
}

.toast-info {
  background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
  border-left: 4px solid #06b6d4;
  color: white;
  box-shadow: 0 10px 25px rgba(8, 145, 178, 0.3);
}
```

---

### 1.3 Toast Component Implementation

```tsx
// components/common/Toast.tsx
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number; // milliseconds, default 3000
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  description,
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Info size={20} />;
    }
  };

  return (
    <div className={`toast toast-${type}`} role="alert">
      <div className="toast-content">
        <div className="toast-icon">{getIcon()}</div>
        <div className="toast-message">
          <div className="toast-title">{message}</div>
          {description && <div className="toast-description">{description}</div>}
        </div>
      </div>
      <button
        className="toast-close"
        onClick={() => onClose(id)}
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
      <div className="toast-progress-bar" style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
};
```

```css
/* components/common/Toast.css */
.toast {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 320px;
  max-width: 420px;
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  animation: slideInRight 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  overflow: hidden;
  z-index: 1000;
}

.toast-content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex: 1;
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.toast-message {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  font-size: 0.9375rem;
  line-height: 1.4;
  color: white;
}

.toast-description {
  font-size: 0.875rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 0.25rem;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  margin-left: 0.75rem;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.toast-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.4);
  animation: progressBar linear forwards;
  border-radius: 0 0 12px 12px;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

@keyframes progressBar {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* Type-specific styles */
.toast-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-left: 4px solid #34d399;
}

.toast-error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-left: 4px solid #f87171;
}

.toast-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-left: 4px solid #fbbf24;
}

.toast-info {
  background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
  border-left: 4px solid #06b6d4;
}
```

### 1.4 Toast Container & Hook

```tsx
// components/common/ToastContainer.tsx
import React from 'react';
import { Toast, ToastType } from './Toast';
import './ToastContainer.css';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onClose}
        />
      ))}
    </div>
  );
};
```

```css
/* components/common/ToastContainer.css */
.toast-container {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  pointer-events: none;
}

.toast-container > * {
  pointer-events: auto;
}
```

```tsx
// hooks/useToast.ts
import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((
    type: ToastType,
    message: string,
    description?: string,
    duration?: number
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastData = { id, type, message, description, duration };
    
    setToasts((prev) => [...prev, newToast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string, description?: string, duration?: number) => {
    return showToast('success', message, description, duration);
  }, [showToast]);

  const error = useCallback((message: string, description?: string, duration?: number) => {
    return showToast('error', message, description, duration || 5000); // Errors stay longer
  }, [showToast]);

  const warning = useCallback((message: string, description?: string, duration?: number) => {
    return showToast('warning', message, description, duration);
  }, [showToast]);

  const info = useCallback((message: string, description?: string, duration?: number) => {
    return showToast('info', message, description, duration);
  }, [showToast]);

  return {
    toasts,
    success,
    error,
    warning,
    info,
    removeToast,
  };
};
```

---

## 2. Confirmation Modals

### 2.1 Overview

All **restrictive/destructive actions** require confirmation via modern modal dialog.

**Examples of actions requiring confirmation:**
- Delete user
- Delete supplier/product
- Logout
- Clear all filters
- Bulk delete operations
- Any irreversible action

---

### 2.2 Confirmation Modal Design

```
┌──────────────────────────────────────────┐
│  ⚠️ Delete User?                         │
│                                          │
│  Are you sure you want to delete user   │
│  "john_doe"?                             │
│                                          │
│  This action cannot be undone.          │
│                                          │
│              [Cancel]  [Delete User]    │
└──────────────────────────────────────────┘
```

---

### 2.3 Confirmation Modal Implementation

```tsx
// components/common/ConfirmModal.tsx
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <div className="confirm-modal-icon">
            <AlertTriangle size={24} />
          </div>
          <h3 className="confirm-modal-title">{title}</h3>
          <button
            className="confirm-modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="confirm-modal-body">
          <p className="confirm-modal-message">{message}</p>
        </div>
        
        <div className="confirm-modal-footer">
          <button
            className="btn-secondary"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`btn-primary btn-${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
```

```css
/* components/common/ConfirmModal.css */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(12, 74, 110, 0.6); /* Ocean blue overlay */
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

.confirm-modal {
  background: var(--bg-primary);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  max-width: 440px;
  width: 90%;
  animation: scaleIn 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  overflow: hidden;
}

.confirm-modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-primary);
}

.confirm-modal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  flex-shrink: 0;
}

.confirm-modal-title {
  flex: 1;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.confirm-modal-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.confirm-modal-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.confirm-modal-body {
  padding: 1.5rem;
}

.confirm-modal-message {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.confirm-modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-primary);
  justify-content: flex-end;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
}

.btn-danger:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

### 2.4 Confirmation Hook

```tsx
// hooks/useConfirm.ts
import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<ConfirmOptions & { isOpen: boolean }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        isOpen: true,
      });

      // Store resolve function
      (window as any).__confirmResolve = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if ((window as any).__confirmResolve) {
      (window as any).__confirmResolve(true);
      delete (window as any).__confirmResolve;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if ((window as any).__confirmResolve) {
      (window as any).__confirmResolve(false);
      delete (window as any).__confirmResolve;
    }
  }, []);

  return {
    confirm,
    confirmState,
    handleConfirm,
    handleCancel,
  };
};

// Usage example:
// const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
// const confirmed = await confirm({ title: 'Delete?', message: 'Are you sure?' });
// if (confirmed) { deleteItem(); }
```

---

## 3. Progress Bars

### 3.1 Overview

For **long-running operations**, show real progress bars to prevent user boredom and provide feedback.

**Use Cases:**
- Large file uploads
- Bulk operations (multiple orders)
- Data export/import
- Database migrations
- Synchronization processes

---

### 3.2 Progress Bar Design

```
┌─────────────────────────────────────────┐
│  Exporting Orders...                    │
│  ████████████░░░░░░░░  60%              │
│  120 of 200 orders processed            │
└─────────────────────────────────────────┘
```

---

### 3.3 Progress Bar Implementation

```tsx
// components/common/ProgressBar.tsx
import React from 'react';
import { X } from 'lucide-react';
import './ProgressBar.css';

interface ProgressBarProps {
  title: string;
  progress: number; // 0-100
  status?: string; // e.g., "120 of 200 orders processed"
  onCancel?: () => void;
  isIndeterminate?: boolean; // For operations without known progress
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  title,
  progress,
  status,
  onCancel,
  isIndeterminate = false,
}) => {
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-header">
        <h4 className="progress-bar-title">{title}</h4>
        {onCancel && (
          <button
            className="progress-bar-cancel"
            onClick={onCancel}
            aria-label="Cancel"
          >
            <X size={18} />
          </button>
        )}
      </div>
      
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill ${isIndeterminate ? 'indeterminate' : ''}`}
          style={!isIndeterminate ? { width: `${progress}%` } : {}}
        />
      </div>
      
      {!isIndeterminate && (
        <div className="progress-bar-info">
          <span className="progress-bar-percentage">{Math.round(progress)}%</span>
          {status && <span className="progress-bar-status">{status}</span>}
        </div>
      )}
      
      {isIndeterminate && status && (
        <div className="progress-bar-status">{status}</div>
      )}
    </div>
  );
};
```

```css
/* components/common/ProgressBar.css */
.progress-bar-container {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-lg);
  min-width: 360px;
  max-width: 480px;
}

.progress-bar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.progress-bar-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.progress-bar-cancel {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.progress-bar-cancel:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.progress-bar-track {
  width: 100%;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0891b2 0%, #06b6d4 100%);
  border-radius: 999px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.progress-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

.progress-bar-fill.indeterminate {
  width: 30% !important;
  animation: indeterminate 1.5s infinite;
}

.progress-bar-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.progress-bar-percentage {
  font-weight: 600;
  color: var(--text-primary);
}

.progress-bar-status {
  color: var(--text-tertiary);
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}
```

---

## 4. Image Drag & Drop Upload

### 4.1 Overview

Optional image upload fields support **modern drag & drop** interface with preview.

**Use Cases:**
- Supplier logos
- Product images
- User avatars
- Order attachments (optional)

---

### 4.2 Drag & Drop Design

```
┌─────────────────────────────────────────┐
│                                         │
│          📷                              │
│     Drag & drop image here              │
│      or click to browse                 │
│                                         │
│      Supports: JPG, PNG, WebP           │
│      Max size: 5MB                      │
│                                         │
└─────────────────────────────────────────┘
```

---

### 4.3 Drag & Drop Implementation

```tsx
// components/common/ImageUpload.tsx
import React, { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import './ImageUpload.css';

interface ImageUploadProps {
  value?: File | string; // File or image URL
  onChange?: (file: File | null) => void;
  maxSize?: number; // in MB, default 5
  accept?: string; // default 'image/*'
  disabled?: boolean;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  maxSize = 5,
  accept = 'image/*',
  disabled = false,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    typeof value === 'string' ? value : null
  );

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      return false;
    }
    if (file.size > maxSize * 1024 * 1024) {
      return false;
    }
    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (!validateFile(file)) {
      // Show error toast
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onChange?.(file);
  }, [maxSize, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [disabled, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    onChange?.(null);
  }, [onChange]);

  return (
    <div className={`image-upload ${className} ${disabled ? 'disabled' : ''}`}>
      <div
        className={`image-upload-area ${isDragging ? 'dragging' : ''} ${preview ? 'has-image' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          disabled={disabled}
          className="image-upload-input"
          id="image-upload-input"
        />

        {preview ? (
          <div className="image-preview">
            <img src={preview} alt="Preview" />
            {!disabled && (
              <button
                className="image-remove"
                onClick={handleRemove}
                type="button"
                aria-label="Remove image"
              >
                <X size={18} />
              </button>
            )}
          </div>
        ) : (
          <label htmlFor="image-upload-input" className="image-upload-label">
            <ImageIcon size={48} className="image-upload-icon" />
            <div className="image-upload-text">
              <span className="image-upload-primary">Drag & drop image here</span>
              <span className="image-upload-secondary">or click to browse</span>
            </div>
            <div className="image-upload-hint">
              Supports: JPG, PNG, WebP • Max: {maxSize}MB
            </div>
          </label>
        )}
      </div>
    </div>
  );
};
```

```css
/* components/common/ImageUpload.css */
.image-upload {
  width: 100%;
}

.image-upload.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.image-upload-area {
  position: relative;
  border: 2px dashed var(--border-primary);
  border-radius: 12px;
  padding: 3rem 2rem;
  background: var(--bg-secondary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  text-align: center;
}

.image-upload-area:hover:not(.disabled) {
  border-color: var(--primary);
  background: var(--bg-tertiary);
}

.image-upload-area.dragging {
  border-color: var(--primary);
  background: var(--primary-light);
  transform: scale(1.02);
}

.image-upload-area.has-image {
  padding: 0;
  border: none;
  background: transparent;
}

.image-upload-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.image-upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.image-upload-icon {
  color: var(--text-tertiary);
  transition: color 0.2s ease;
}

.image-upload-area:hover .image-upload-icon {
  color: var(--primary);
}

.image-upload-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.image-upload-primary {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.image-upload-secondary {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.image-upload-hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: 0.5rem;
}

.image-preview {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 16/9;
  background: var(--bg-tertiary);
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-remove {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.image-remove:hover {
  background: rgba(220, 38, 38, 1);
  transform: scale(1.1);
}
```

---

## 5. Animation Guidelines

### 5.1 Animation Principles

**All animations must be:**
- ✅ **Smooth**: Use easing functions (cubic-bezier)
- ✅ **Short**: 200-300ms for most interactions
- ✅ **Modern**: Follow current design trends
- ✅ **Purposeful**: Every animation has a reason
- ✅ **Performant**: Use CSS transforms, not layout properties

---

### 5.2 Animation Durations

```css
/* Animation Timing */
--duration-fast: 150ms;    /* Hover, focus states */
--duration-normal: 200ms;  /* Default transitions */
--duration-slow: 300ms;    /* Modal, large changes */
```

---

### 5.3 Easing Functions

```css
/* Modern Easing Functions */
--ease-out: cubic-bezier(0.4, 0, 0.2, 1);      /* Default */
--ease-in: cubic-bezier(0.4, 0, 1, 1);         /* Enter animations */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);   /* Complex animations */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Playful */
```

---

## Document Control

**Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Complete

