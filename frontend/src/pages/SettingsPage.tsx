import { useState, useEffect, useRef } from 'react';
import { Save, Database, Server, Monitor, Loader2, CheckCircle, AlertCircle, RefreshCw, Wifi, ArrowLeft, MessageSquare, Download, Upload, HardDrive, User, Image as ImageIcon, X, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import PasswordModal from '../components/PasswordModal';
import ProgressBar from '../components/ProgressBar';
import { configService, type AppConfig } from '../services/config.service';
import api, { updateApiBaseUrl } from '../lib/api';
import '../styles/settings.css';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Helper function to get full avatar URL
function getAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  const serverBaseUrl = configService.getServerBaseUrl();
  return `${serverBaseUrl}${avatarPath}`;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [initializingDatabase, setInitializingDatabase] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [localIp, setLocalIp] = useState<string>('');
  const [whatsappMessage, setWhatsappMessage] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFilePath, setRestoreFilePath] = useState<string>('');
  const [showBackupPasswordModal, setShowBackupPasswordModal] = useState(false);
  const [showRestorePasswordModal, setShowRestorePasswordModal] = useState(false);
  const [restorePassword, setRestorePassword] = useState<string>('');
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [pendingBackupFilePath, setPendingBackupFilePath] = useState<string | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [profileUsername, setProfileUsername] = useState<string>('');
  const [profilePassword, setProfilePassword] = useState<string>('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState<string>('');
  const [profileAvatar, setProfileAvatar] = useState<File | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);
  const [settingsPassword, setSettingsPassword] = useState<string>('');
  const [showSettingsPasswordModal, setShowSettingsPasswordModal] = useState(false);
  const [settingsPasswordVerified, setSettingsPasswordVerified] = useState(() => {
    // Check if password was verified in this session
    return sessionStorage.getItem('settings_password_verified') === 'true';
  });

  useEffect(() => {
    loadSettings();
    detectLocalIp();
    
    // Subscribe to config changes - update state directly from cached config to avoid infinite loop
    const unsubscribe = configService.subscribe(() => {
      const cachedConfig = configService.getConfig();
      if (cachedConfig) {
        setConfig(cachedConfig);
      }
    });

    return unsubscribe;
  }, []);

  // Load user's WhatsApp message when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      setWhatsappMessage(user.whatsappMessage || '');
      setProfileUsername(user.username || '');
      setProfileAvatarPreview(
        user.avatar ? getAvatarUrl(user.avatar) : null
      );
      setAvatarRemoved(false);
    } else {
      setWhatsappMessage('');
      setProfileUsername('');
      setProfileAvatarPreview(null);
      setAvatarRemoved(false);
    }
  }, [isAuthenticated, user]);

  const detectLocalIp = async () => {
    try {
      // In Electron, use the IPC handler to get local network IP
      if (window.electron?.getLocalIp) {
        const ip = await window.electron.getLocalIp();
        setLocalIp(ip);
        return;
      }
      
      // Fallback: Try to get public IP (not ideal, but works)
      const response = await fetch('https://api.ipify.org?format=json').catch(() => null);
      if (response) {
        const data = await response.json();
        // Use localhost instead of public IP for server mode
        setLocalIp('localhost');
      } else {
        setLocalIp('localhost');
      }
    } catch (error) {
      setLocalIp('localhost');
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const loadedConfig = await configService.loadConfig();
      setConfig(loadedConfig);
      
      // Apply language from config if available
      if (loadedConfig.language && i18n.language !== loadedConfig.language) {
        i18n.changeLanguage(loadedConfig.language);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error(t('settings.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseProviderChange = (provider: 'sqlite' | 'mysql' | 'postgresql') => {
    if (!config) return;
    
    setConfig({
      ...config,
      database: {
        ...config.database,
        type: provider,
        url: provider === 'sqlite' ? config.database.path || './database.db' : config.database.url || '',
      },
    });
  };

  const getDefaultDatabaseUrl = (provider: 'sqlite' | 'mysql' | 'postgresql'): string => {
    switch (provider) {
      case 'sqlite':
        return './database.db';
      case 'mysql':
        return 'mysql://user:password@localhost:3306/order_db';
      case 'postgresql':
        return 'postgresql://user:password@localhost:5432/order_db?schema=public';
      default:
        return '';
    }
  };

  const testDatabaseConnection = async () => {
    if (!config) return;
    
    try {
      setTestingConnection(true);
      setConnectionStatus('idle');
      setConnectionMessage('');

      // Validate required fields
      if (config.database.type === 'sqlite') {
        const dbPath = config.database.path || config.database.url?.replace('file:', '');
        if (!dbPath || dbPath.trim().length === 0) {
          setConnectionStatus('error');
          setConnectionMessage('Please provide a database path for SQLite');
          return;
        }
      } else {
        if (!config.database.url || config.database.url.trim().length === 0) {
          setConnectionStatus('error');
          setConnectionMessage('Please provide a database connection URL');
          return;
        }
      }

      // Call the backend API to test the database connection
      const response = await api.post('/database/test', {
        type: config.database.type,
        url: config.database.url,
        path: config.database.type === 'sqlite' 
          ? (config.database.path || config.database.url?.replace('file:', ''))
          : undefined,
      });

      if (response.data.success) {
        setConnectionStatus('success');
        const message = response.data.data?.message || 'Database connection successful!';
        const initialized = response.data.data?.initialized || false;
        
        if (initialized) {
          toast.success(
            `${message}\n\nDatabase schema has been created and initial data has been seeded.\nDefault admin credentials:\nUsername: admin\nPassword: admin123`,
            { duration: 8000 }
          );
        } else {
          toast.success(message, { duration: 3000 });
        }
        setConnectionMessage(message);
      } else {
        setConnectionStatus('error');
        const errorMessage = response.data.error?.message || 'Failed to connect to database';
        toast.error(errorMessage);
        setConnectionMessage(errorMessage);
      }
    } catch (error: any) {
      setConnectionStatus('error');
      const errorMessage = 
        error.response?.data?.error?.message || 
        error.response?.data?.message ||
        error.message || 
        'Failed to connect to database';
      setConnectionMessage(errorMessage);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleInitializeDatabase = async () => {
    if (!config) return;
    
    try {
      setInitializingDatabase(true);

      // Validate required fields
      if (config.database.type === 'sqlite') {
        const dbPath = config.database.path || config.database.url?.replace('file:', '');
        if (!dbPath || dbPath.trim().length === 0) {
          toast.error('Please provide a database path for SQLite');
          return;
        }
      } else {
        if (!config.database.url || config.database.url.trim().length === 0) {
          toast.error('Please provide a database connection URL');
          return;
        }
      }

      // Call the backend API to initialize the database
      const response = await api.post('/database/initialize', {
        type: config.database.type,
        url: config.database.url,
        path: config.database.type === 'sqlite' 
          ? (config.database.path || config.database.url?.replace('file:', ''))
          : undefined,
        force: false, // Don't force if tables already exist
      });

      if (response.data.success) {
        const message = response.data.data?.message || 'Database initialized successfully!';
        
        if (message.includes('already initialized')) {
          toast.success(message, { duration: 3000 });
        } else {
          toast.success(
            `${message}\n\nDatabase schema has been created and initial data has been seeded.\nDefault admin credentials:\nUsername: admin\nPassword: admin123\n\nYou can now log in with these credentials.`,
            { duration: 10000 }
          );
        }
        
        // Update connection status
        setConnectionStatus('success');
        setConnectionMessage(message);
      } else {
        const errorMessage = response.data.error?.message || 'Failed to initialize database';
        toast.error(errorMessage);
        setConnectionStatus('error');
        setConnectionMessage(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.error?.message || 
        error.response?.data?.message ||
        error.message || 
        'Failed to initialize database';
      toast.error(errorMessage);
      setConnectionStatus('error');
      setConnectionMessage(errorMessage);
    } finally {
      setInitializingDatabase(false);
    }
  };

  const testServerConnection = async () => {
    if (!config || config.mode !== 'client' || !config.serverAddress) return;

    try {
      setTestingConnection(true);
      setConnectionStatus('idle');
      setConnectionMessage('');

      const port = config.serverPort || 3000;
      const url = `http://${config.serverAddress}:${port}/api/v1/auth/me`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok || response.status === 401) {
        // 401 is OK - it means server is reachable (just not authenticated)
        setConnectionStatus('success');
        setConnectionMessage(`Server is reachable at ${config.serverAddress}:${port}`);
      } else {
        setConnectionStatus('error');
        setConnectionMessage('Server is not reachable');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setConnectionMessage(`Connection failed: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      
      // Prepare config to save
      const configToSave: Partial<AppConfig> = {
        mode: config.mode,
        serverPort: config.serverPort || 3000,
        database: {
          type: config.database.type,
          ...(config.database.type === 'sqlite' 
            ? { path: config.database.path || config.database.url?.replace('file:', '') || './database.db' }
            : { url: config.database.url || '' }
          ),
        },
        theme: config.theme || 'system',
        language: config.language || 'es',
      };

      // Set serverAddress based on mode
      if (config.mode === 'server') {
        // In server mode, use the configured serverAddress (should be localhost, 127.0.0.1, or network IP)
        // If not set, default to localhost
        if (config.serverAddress && (config.serverAddress === 'localhost' || config.serverAddress === '127.0.0.1' || 
            config.serverAddress.match(/^(\d{1,3}\.){3}\d{1,3}$/))) {
          configToSave.serverAddress = config.serverAddress;
        } else {
          // Default to localhost for server mode
          configToSave.serverAddress = 'localhost';
        }
      } else if (config.mode === 'client') {
        configToSave.serverAddress = config.serverAddress || '';
      }

      const saveResult = await configService.saveConfig(configToSave);
      
      // Reload config to ensure we have the latest values
      const updatedConfig = await configService.loadConfig();
      setConfig(updatedConfig);
      
      // Update API base URL immediately after config is saved
      updateApiBaseUrl();
      console.log('🔗 Config saved, API Base URL updated to:', configService.getApiBaseUrl());

      // Apply language immediately if changed
      if (config.language && i18n.language !== config.language) {
        i18n.changeLanguage(config.language);
      }

      // Apply theme immediately if changed
      const root = document.documentElement;
      if (config.theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        // Sync localStorage
        localStorage.removeItem('theme');
      } else if (config.theme) {
        root.setAttribute('data-theme', config.theme);
        // Sync localStorage
        localStorage.setItem('theme', config.theme);
      } else {
        root.removeAttribute('data-theme');
      }

      setShowSaveModal(false);

      // Show success message based on whether server was restarted
      if (saveResult?.needsRestart) {
        toast.success(
          `Settings saved! Server port changed to ${saveResult.newPort}. Please restart the application for the change to take effect.`,
          {
            duration: 8000,
          }
        );
      } else if (saveResult?.newPort) {
        toast.success(
          `Settings saved! Server restarted on port ${saveResult.newPort}.`,
          {
            duration: 5000,
          }
        );
      } else {
        toast.success(
          'Settings saved successfully!',
          {
            duration: 3000,
          }
        );
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to save your WhatsApp message');
      return;
    }

    try {
      setSavingProfile(true);

      // Update user profile with WhatsApp message
      await api.patch('/auth/profile', {
        whatsappMessage: whatsappMessage || null,
      });

      // Refresh auth store to get updated user data
      await checkAuth();

      toast.success('WhatsApp message saved successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.message || 'Failed to save WhatsApp message');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfileAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setProfileAvatar(file);
      setProfileAvatarPreview(URL.createObjectURL(file));
      setAvatarRemoved(false);
    }
  };

  const handleRemoveAvatar = () => {
    setProfileAvatar(null);
    setProfileAvatarPreview(null);
    setAvatarRemoved(true);
    if (profileAvatarInputRef.current) {
      profileAvatarInputRef.current.value = '';
    }
  };

  const handleVerifySettingsPassword = async () => {
    if (!settingsPassword.trim()) {
      toast.error(t('settings.passwordRequired') || 'Password is required');
      return;
    }

    try {
      // Verify admin password using the dedicated endpoint
      await api.post('/auth/verify-admin-password', {
        password: settingsPassword,
      });

      setSettingsPasswordVerified(true);
      // Store verification in sessionStorage so it persists for the session
      sessionStorage.setItem('settings_password_verified', 'true');
      setShowSettingsPasswordModal(false);
      setSettingsPassword('');
      toast.success(t('settings.passwordVerified') || 'Admin password verified successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || t('settings.invalidPassword') || 'Invalid admin password';
      toast.error(errorMessage);
      setSettingsPassword('');
    }
  };

  const handleSettingsPasswordConfirm = async (password: string) => {
    setSettingsPassword(password);
    await handleVerifySettingsPassword();
  };

  const handleUpdateProfile = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to update your profile');
      return;
    }

    // Validate password if provided
    if (profilePassword && profilePassword !== profileConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (profilePassword && profilePassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setUpdatingProfile(true);

      // Upload avatar first if a new one is selected
      if (profileAvatar) {
        const formData = new FormData();
        formData.append('avatar', profileAvatar);
        await api.post('/auth/profile/avatar', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      // Update profile data
      const updateData: any = {};
      if (profileUsername && profileUsername !== user?.username) {
        updateData.username = profileUsername;
      }
      if (profilePassword) {
        updateData.password = profilePassword;
      }
      if (avatarRemoved && !profileAvatar) {
        // User explicitly removed avatar
        updateData.avatar = null;
      }

      if (Object.keys(updateData).length > 0) {
        await api.patch('/auth/profile', updateData);
      }

      // Refresh auth store to get updated user data
      await checkAuth();

      // Clear password fields and reset avatar state
      setProfilePassword('');
      setProfileConfirmPassword('');
      setProfileAvatar(null);
      setAvatarRemoved(false);

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.message || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleBackupDatabase = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to backup the database');
      return;
    }
    
    // Check if Electron dialog is available
    if (!window.electron?.dialog?.showSaveDialog) {
      toast.error('File save dialog is not available. Running in web mode?');
      return;
    }

    try {
      // Show file save dialog FIRST to choose backup location and filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                       new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const defaultFileName = `database_backup_${timestamp}.omw`;

      const result = await window.electron.dialog.showSaveDialog({
        title: 'Save Database Backup',
        defaultPath: defaultFileName,
        filters: [
          { name: t('settings.backupFiles'), extensions: ['omw'] },
          { name: t('settings.allFiles'), extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        // User cancelled, don't proceed
        return;
      }

      // Store the selected file path and show password modal
      setPendingBackupFilePath(result.filePath);
      setShowBackupPasswordModal(true);
    } catch (error: any) {
      console.error('Error showing save dialog:', error);
      toast.error('Failed to show file save dialog: ' + (error.message || 'Unknown error'));
    }
  };

  // Helper function to simulate progress
  const startProgressSimulation = (setProgress: (value: number | ((prev: number) => number)) => void): NodeJS.Timeout => {
    let progress = 0;
    // Faster progress at the start (0-70%), slower near completion (70-90%), then wait for completion
    return setInterval(() => {
      if (progress < 70) {
        progress += Math.random() * 15 + 5; // Fast progress: 5-20% per interval
      } else if (progress < 90) {
        progress += Math.random() * 5 + 2; // Slower progress: 2-7% per interval
      } else if (progress < 95) {
        progress += Math.random() * 2 + 0.5; // Very slow: 0.5-2.5% per interval
      }
      // Don't exceed 95% until backup is actually complete
      setProgress(Math.min(95, progress));
    }, 200); // Update every 200ms
  };

  const handleConfirmBackupPassword = async (password: string) => {
    // Close password modal
    setShowBackupPasswordModal(false);

    // Get the file path that was selected before password modal
    const filePath = pendingBackupFilePath;
    setPendingBackupFilePath(null);

    if (!filePath) {
      toast.error('No file path selected');
      return;
    }

    try {
      setBackingUp(true);
      setBackupProgress(0);

      // Start progress simulation
      progressIntervalRef.current = startProgressSimulation(setBackupProgress);

      // Create backup at user-selected location with optional password
      const response = await api.post('/backup/create', {
        password: password || undefined,
        filePath: filePath,
      });
      
      // Clear progress interval and set to 100%
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setBackupProgress(100);
      
      const { size, encrypted } = response.data.data;

      // Wait a bit to show 100% before hiding
      setTimeout(() => {
        setBackingUp(false);
        setBackupProgress(0);
      }, 500);

      // Show success message
      toast.success(
        `Database backup created successfully! (${size} MB)${encrypted ? ' (encrypted)' : ''}\nSaved to: ${filePath.split(/[/\\]/).pop()}`,
        { duration: 6000 }
      );
    } catch (error: any) {
      // Clear progress on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setBackupProgress(0);
      setBackingUp(false);
      toast.error(error.response?.data?.error?.message || error.message || 'Failed to create backup');
    }
  };

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleSelectRestoreFile = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to restore the database');
      return;
    }

    try {
      if (!window.electron?.dialog) {
        toast.error('File selection is only available in the desktop application');
        return;
      }

      const result = await window.electron.dialog.showOpenDialog({
        title: 'Select Database Backup File',
        filters: [
          { name: t('settings.backupFiles'), extensions: ['omw', 'encrypted.omw'] },
          { name: t('settings.legacyFiles'), extensions: ['db', 'encrypted.db', 'sql', 'encrypted.sql'] },
          { name: t('settings.allFiles'), extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        setRestoreFilePath(selectedPath);
        
        // Check if the backup is encrypted
        try {
          const checkResponse = await api.post('/backup/check-encryption', {
            filePath: selectedPath,
          });
          
          const { encrypted } = checkResponse.data.data;
          
          if (encrypted) {
            // Show password modal for encrypted backup
            setRestorePassword('');
            setShowRestorePasswordModal(true);
          } else {
            // Not encrypted, show restore confirmation directly
            setShowRestoreConfirm(true);
          }
        } catch (error: any) {
          // If check fails, assume not encrypted and proceed
          console.error('Failed to check encryption:', error);
          setShowRestoreConfirm(true);
        }
      }
    } catch (error: any) {
      toast.error('Failed to select backup file');
      console.error('File selection error:', error);
    }
  };

  const handleConfirmRestorePassword = (password: string) => {
    setRestorePassword(password);
    setShowRestorePasswordModal(false);
    // Show restore confirmation modal after password is entered
    setShowRestoreConfirm(true);
  };

  const handleRestoreDatabase = async () => {
    if (!restoreFilePath) {
      toast.error('Please select a backup file first');
      return;
    }

    try {
      setRestoring(true);
      setShowRestoreConfirm(false);

      // Send restore request to backend with password if provided
      await api.post('/backup/restore', {
        filePath: restoreFilePath,
        password: restorePassword || undefined,
      });

      toast.success(
        'Database restored successfully! Please restart the application for changes to take effect.',
        { duration: 6000 }
      );
      
      setRestoreFilePath('');
      setRestorePassword('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to restore database';
      
      // If password was wrong, show password modal again
      if (errorMessage.includes('password') || errorMessage.includes('decrypt')) {
        setShowRestorePasswordModal(true);
      } else {
        toast.error(errorMessage);
        setRestoreFilePath('');
        setRestorePassword('');
      }
    } finally {
      setRestoring(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={!isAuthenticated ? { padding: '2rem', maxWidth: '1200px', margin: '0 auto' } : {}}>
      {!isAuthenticated && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/login')}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ArrowLeft size={18} />
            {t('settings.backToLogin')}
          </button>
        </div>
      )}
      <div className="page-header">
        <div>
          <h1>{t('settings.applicationSettings')}</h1>
          <p className="page-subtitle">{t('settings.configureSettings')}</p>
          {!isAuthenticated && (
            <p className="page-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              {t('settings.configureBeforeLogin')}
            </p>
          )}
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowSaveModal(true)}
          disabled={saving}
        >
          <Save size={20} />
          {t('settings.saveSettings')}
        </button>
      </div>

      {/* Password Protection for Non-Admin Users */}
      {isAuthenticated && user?.role !== 'SUPER_ADMIN' && !settingsPasswordVerified && (
        <div className="info-box" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--warning-light)', border: '1px solid var(--warning)' }}>
          <AlertCircle size={20} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{t('settings.advancedSettingsProtected') || 'Advanced Settings Protected'}</p>
            <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              {t('settings.advancedSettingsProtectedDesc') || 'To access database configuration, server port settings, and other advanced settings, you must verify the admin password.'}
            </p>
            <button
              className="btn-primary"
              onClick={() => setShowSettingsPasswordModal(true)}
            >
              {t('settings.enterPassword') || 'Enter Admin Password'}
            </button>
          </div>
        </div>
      )}

      <div className="settings-grid">
        {/* Server/Client Mode Configuration
            - Visible before login for initial setup
            - After login, only SUPER_ADMIN or users who verified password */}
        {(!isAuthenticated || user?.role === 'SUPER_ADMIN' || settingsPasswordVerified) && (
        <section className="settings-section">
          <div className="section-header">
            <Server size={24} />
            <h2>{t('settings.applicationMode')}</h2>
          </div>

          <div className="settings-content">
            <div className="form-group">
              <label>
                {t('settings.mode')} <span className="required">*</span>
              </label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="appMode"
                    value="server"
                    checked={config.mode === 'server'}
                    onChange={async () => {
                      // When switching to server mode, automatically set serverAddress to localhost, 127.0.0.1, or PC IP
                      let serverAddress = 'localhost';
                      
                      // Try to get the local network IP address
                      if (window.electron?.getLocalIp) {
                        try {
                          const ip = await window.electron.getLocalIp();
                          // If we got a valid network IP (not localhost or 127.0.0.1), use it for serverAddress
                          // This allows the server to be accessed via network IP
                          if (ip && ip !== 'localhost' && !ip.startsWith('127.')) {
                            // Use the network IP for serverAddress when in server mode
                            serverAddress = ip;
                          } else {
                            // Fallback to localhost
                            serverAddress = 'localhost';
                          }
                        } catch (error) {
                          // Fallback to localhost
                          serverAddress = 'localhost';
                        }
                      }
                      
                      setConfig({ ...config, mode: 'server', serverAddress });
                    }}
                  />
                  <span>{t('settings.serverMode')}</span>
                  <small>{t('settings.serverModeDesc')}</small>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="appMode"
                    value="client"
                    checked={config.mode === 'client'}
                    onChange={() =>
                      setConfig({ ...config, mode: 'client' })
                    }
                  />
                  <span>{t('settings.clientMode')}</span>
                  <small>{t('settings.clientModeDesc')}</small>
                </label>
              </div>
            </div>

            {config.mode === 'server' && (
              <div className="form-group">
                <label>{t('settings.serverPort')}</label>
                <input
                  type="number"
                  value={config.serverPort || 3000}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      serverPort: parseInt(e.target.value) || 3000,
                    })
                  }
                  min={1024}
                  max={65535}
                  className="form-input"
                />
                  <small className="form-hint">{t('settings.defaultPort')}</small>
                {localIp && localIp !== 'localhost' && localIp !== '127.0.0.1' && (
                  <div className="info-box" style={{ marginTop: '0.5rem' }}>
                    <Wifi size={16} />
                    <span>{t('settings.shareAddress', { address: `${localIp}:${config.serverPort || 3000}` })}</span>
                  </div>
                )}
              </div>
            )}

            {config.mode === 'client' && (
              <>
                <div className="form-group">
                  <label>
                    {t('settings.serverIpAddress')} <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.serverAddress || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        serverAddress: e.target.value,
                      })
                    }
                    placeholder="192.168.1.100"
                    className="form-input"
                  />
                  <small className="form-hint">
                    {t('settings.ipAddressHint')}
                  </small>
                </div>
                
                <div className="form-group">
                  <label>{t('settings.serverPort')}</label>
                  <input
                    type="number"
                    value={config.serverPort || 3000}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        serverPort: parseInt(e.target.value) || 3000,
                      })
                    }
                    min={1024}
                    max={65535}
                    className="form-input"
                  />
                  <small className="form-hint">{t('settings.portHint')}</small>
                </div>

                <div className="form-actions-inline">
                  <button
                    className="btn-secondary"
                    onClick={testServerConnection}
                    disabled={testingConnection || !config.serverAddress}
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="spinner" size={16} />
                        {t('settings.testing')}
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        {t('settings.testConnection')}
                      </>
                    )}
                  </button>
                  {connectionStatus !== 'idle' && (
                    <div className={`connection-status ${connectionStatus}`}>
                      {connectionStatus === 'success' ? (
                        <>
                          <CheckCircle size={16} />
                          {connectionMessage}
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} />
                          {connectionMessage}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
        )}

        {/* Database Configuration
            - Visible before login for initial setup
            - After login, only SUPER_ADMIN or users who verified password */}
        {(!isAuthenticated || user?.role === 'SUPER_ADMIN' || settingsPasswordVerified) && (
        <section className="settings-section">
          <div className="section-header">
            <Database size={24} />
            <h2>{t('settings.databaseConfiguration')}</h2>
          </div>

          <div className="settings-content">
            <div className="form-group">
              <label>
                {t('settings.databaseProvider')} <span className="required">*</span>
              </label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="dbProvider"
                    value="sqlite"
                    checked={config.database.type === 'sqlite'}
                    onChange={() => handleDatabaseProviderChange('sqlite')}
                  />
                  <span>{t('settings.sqliteDefault')}</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="dbProvider"
                    value="mysql"
                    checked={config.database.type === 'mysql'}
                    onChange={() => handleDatabaseProviderChange('mysql')}
                  />
                  <span>MySQL</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="dbProvider"
                    value="postgresql"
                    checked={config.database.type === 'postgresql'}
                    onChange={() => handleDatabaseProviderChange('postgresql')}
                  />
                  <span>PostgreSQL</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>
                {config.database.type === 'sqlite' ? t('settings.databasePath') : t('settings.databaseUrl')} <span className="required">*</span>
              </label>
              <input
                type="text"
                value={config.database.type === 'sqlite' 
                  ? (config.database.path || config.database.url?.replace('file:', '') || '')
                  : (config.database.url || '')
                }
                onChange={(e) => {
                  if (config.database.type === 'sqlite') {
                    setConfig({
                      ...config,
                      database: { ...config.database, path: e.target.value, url: `file:${e.target.value}` },
                    });
                  } else {
                    setConfig({
                      ...config,
                      database: { ...config.database, url: e.target.value },
                    });
                  }
                }}
                placeholder={getDefaultDatabaseUrl(config.database.type)}
                className="form-input"
              />
              <small className="form-hint">
                {config.database.type === 'sqlite' && 'File path for SQLite database'}
                {config.database.type === 'mysql' && 'MySQL connection string (mysql://user:password@host:port/database)'}
                {config.database.type === 'postgresql' && 'PostgreSQL connection string (postgresql://user:password@host:port/database?schema=public)'}
              </small>
            </div>

            {config.mode === 'server' && (
            <div className="form-actions-inline" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                className="btn-secondary"
                onClick={testDatabaseConnection}
                disabled={testingConnection || initializingDatabase || !config.database.url}
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="spinner" size={16} />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Test Connection
                  </>
                )}
              </button>
              <button
                className="btn-primary"
                onClick={handleInitializeDatabase}
                disabled={testingConnection || initializingDatabase || !config.database.url}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {initializingDatabase ? (
                  <>
                    <Loader2 className="spinner" size={16} />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Database size={16} />
                    Initialize Database
                  </>
                )}
              </button>
              {connectionStatus !== 'idle' && (
                <div className={`connection-status ${connectionStatus}`} style={{ width: '100%', marginTop: '0.5rem' }}>
                  {connectionStatus === 'success' ? (
                    <>
                      <CheckCircle size={16} />
                      {connectionMessage}
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} />
                      {connectionMessage}
                    </>
                  )}
                </div>
              )}
              <small className="form-hint" style={{ width: '100%', marginTop: '0.25rem' }}>
                <strong>{t('settings.initializeDatabase')}:</strong> {t('settings.initializeDatabaseDesc')}
              </small>
            </div>
            )}
          </div>
        </section>
        )}

        {/* Theme Configuration */}
        <section className="settings-section">
          <div className="section-header">
            <Monitor size={24} />
            <h2>{t('settings.appearance')}</h2>
          </div>

          <div className="settings-content">
            <div className="form-group">
              <label>
                {t('settings.theme')} <span className="required">*</span>
              </label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={config.theme === 'light'}
                    onChange={() =>
                      setConfig({ ...config, theme: 'light' })
                    }
                  />
                  <span>{t('settings.light')}</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={config.theme === 'dark'}
                    onChange={() =>
                      setConfig({ ...config, theme: 'dark' })
                    }
                  />
                  <span>{t('settings.dark')}</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="theme"
                    value="system"
                    checked={config.theme === 'system'}
                    onChange={() =>
                      setConfig({ ...config, theme: 'system' })
                    }
                  />
                  <span>{t('settings.system')}</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Language Configuration */}
        <section className="settings-section">
          <div className="section-header">
            <Globe size={24} />
            <h2>{t('settings.language')}</h2>
          </div>

          <div className="settings-content">
            <div className="form-group">
              <label>
                {t('settings.language')} <span className="required">*</span>
              </label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="language"
                    value="es"
                    checked={(config.language || 'es') === 'es'}
                    onChange={() =>
                      setConfig({ ...config, language: 'es' })
                    }
                  />
                  <span>{t('settings.spanish')}</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="language"
                    value="en"
                    checked={config.language === 'en'}
                    onChange={() =>
                      setConfig({ ...config, language: 'en' })
                    }
                  />
                  <span>{t('settings.english')}</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Profile Configuration - Only visible when authenticated */}
        {isAuthenticated && (
          <section className="settings-section">
            <div className="section-header">
              <User size={24} />
              <h2>{t('settings.profile')}</h2>
            </div>

            <div className="settings-content">
              {/* Avatar Upload */}
              <div className="form-group">
                <label>{t('settings.profileAvatar')}</label>
                <div className="avatar-upload-container" style={{ marginTop: '0.5rem' }}>
                  <div className="avatar-preview-wrapper">
                    {profileAvatarPreview ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={profileAvatarPreview}
                          alt={t('users.avatarPreview')}
                          style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid var(--border-color)',
                          }}
                        />
                        {(profileAvatar || user?.avatar) && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              background: 'var(--danger-color)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title={t('users.removeAvatar')}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '100px',
                          height: '100px',
                          borderRadius: '50%',
                          background: 'var(--bg-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px dashed var(--border-color)',
                        }}
                      >
                        <User size={48} style={{ color: 'var(--text-secondary)' }} />
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={profileAvatarInputRef}
                    onChange={handleProfileAvatarChange}
                    accept="image/*"
                    id="profile-avatar-upload"
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="profile-avatar-upload"
                    className="btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      marginTop: '0.5rem',
                    }}
                  >
                    <ImageIcon size={16} />
                    {profileAvatarPreview ? t('users.changeAvatar') : t('users.uploadAvatar')}
                  </label>
                </div>
                <small className="form-hint">
                  {t('settings.avatarUploadHint')}
                </small>
              </div>

              {/* Username - Only editable for SUPER_ADMIN */}
              <div className="form-group">
                <label>
                  {t('users.username')} {user?.role === 'SUPER_ADMIN' && <span className="required">*</span>}
                </label>
                <input
                  type="text"
                  value={profileUsername}
                  onChange={(e) => {
                    // Only allow editing if user is SUPER_ADMIN
                    if (user?.role === 'SUPER_ADMIN') {
                      setProfileUsername(e.target.value);
                    }
                  }}
                  placeholder={t('users.enterUsername')}
                  className="form-input"
                  disabled={user?.role !== 'SUPER_ADMIN'}
                  readOnly={user?.role !== 'SUPER_ADMIN'}
                />
                <small className="form-hint">
                  {user?.role !== 'SUPER_ADMIN' 
                    ? t('settings.usernameNotEditable')
                    : t('settings.usernameHint')
                  }
                </small>
              </div>

              {/* Password */}
              <div className="form-group">
                <label>
                  {t('settings.newPassword')}
                </label>
                <input
                  type="password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder={t('users.enterNewPassword')}
                  className="form-input"
                />
                <small className="form-hint">
                  {t('settings.passwordHint')}
                </small>
              </div>

              {/* Confirm Password */}
              {profilePassword && (
                <div className="form-group">
                  <label>
                    {t('settings.confirmNewPassword')}
                  </label>
                  <input
                    type="password"
                    value={profileConfirmPassword}
                    onChange={(e) => setProfileConfirmPassword(e.target.value)}
                    placeholder={t('settings.confirmNewPasswordPlaceholder')}
                    className="form-input"
                  />
                </div>
              )}

              <div className="form-actions-inline">
                <button
                  className="btn-primary"
                  onClick={handleUpdateProfile}
                  disabled={updatingProfile || !isAuthenticated}
                >
                  {updatingProfile ? (
                    <>
                      <Loader2 className="spinner" size={16} />
                      {t('common.loading')}
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {t('settings.updateProfile')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* WhatsApp Message Configuration - Only visible when authenticated */}
        {isAuthenticated && (
          <section className="settings-section">
            <div className="section-header">
              <MessageSquare size={24} />
              <h2>{t('settings.whatsappMessage')}</h2>
            </div>

            <div className="settings-content">
              <div className="form-group">
                <label>
                  {t('settings.whatsappMessageTemplate')}
                </label>
                <textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="Hola, tu pedido está listo para recoger."
                  className="form-input"
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
                <small className="form-hint">
                  {t('settings.whatsappMessageHint')}
                </small>
              </div>

              <div className="form-actions-inline">
                <button
                  className="btn-primary"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="spinner" size={16} />
                      {t('common.loading')}
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {t('settings.saveWhatsAppMessage')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Database Backup & Restore - Only visible when authenticated as Super Admin or with password */}
        {isAuthenticated && (user?.role === 'SUPER_ADMIN' || settingsPasswordVerified) && (
          <section className="settings-section">
            <div className="section-header">
              <HardDrive size={24} />
              <h2>{t('settings.databaseBackupRestore')}</h2>
            </div>

            <div className="settings-content">
              <div className="form-group">
                <label>{t('settings.backupDatabase')}</label>
                <p className="form-hint" style={{ marginTop: '0.25rem', marginBottom: '1rem' }}>
                  {t('settings.backupDatabaseHint')}
                </p>
                <button
                  className="btn-secondary"
                  onClick={handleBackupDatabase}
                  disabled={backingUp}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: backingUp ? '1rem' : '0' }}
                >
                  {backingUp ? (
                    <>
                      <Loader2 className="spinner" size={16} />
                      {t('settings.creatingBackup')}
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      {t('settings.createBackup')}
                    </>
                  )}
                </button>
                {backingUp && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <ProgressBar
                      progress={backupProgress}
                      label={t('settings.backupProgress')}
                      showPercentage={true}
                      animated={true}
                      color="primary"
                      size="md"
                      striped={true}
                    />
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label>{t('settings.restoreDatabase')}</label>
                <p className="form-hint" style={{ marginTop: '0.25rem', marginBottom: '1rem' }}>
                  {t('settings.restoreDatabaseHint')}
                </p>
                <button
                  className="btn-secondary"
                  onClick={handleSelectRestoreFile}
                  disabled={restoring || backingUp}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {restoring ? (
                    <>
                      <Loader2 className="spinner" size={16} />
                      {t('settings.restoring')}
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      {t('settings.restoreFromBackup')}
                    </>
                  )}
                </button>
                {restoreFilePath && (
                  <p className="form-hint" style={{ marginTop: '0.5rem', color: 'var(--primary-color)' }}>
                    {t('settings.selected')}: {restoreFilePath.split(/[/\\]/).pop()}
                  </p>
                )}
                {restorePassword && (
                  <p className="form-hint" style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {t('settings.passwordEntered')}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Save Confirmation Modal */}
      <ConfirmModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onConfirm={handleSave}
        title={t('settings.saveSettings')}
        message={
          <div>
            <p>Are you sure you want to save these settings?</p>
            {config.database.type !== 'sqlite' && (
              <p className="warning-text">
                Changing database provider may require database migration. Make sure you have backups.
              </p>
            )}
            {config.mode === 'client' && !config.serverAddress && (
              <p className="warning-text">
                Please provide a server IP address for client mode.
              </p>
            )}
            <p className="warning-text" style={{ marginTop: '1rem' }}>
              <strong>Note:</strong> Some changes may require restarting the application.
            </p>
          </div>
        }
        confirmText={t('settings.saveSettings')}
        cancelText={t('common.cancel')}
        type="info"
        loading={saving}
      />

      {/* Restore Confirmation Modal */}
      <ConfirmModal
        isOpen={showRestoreConfirm}
        onClose={() => {
          setShowRestoreConfirm(false);
          setRestoreFilePath('');
          setRestorePassword('');
        }}
        onConfirm={handleRestoreDatabase}
        title={t('settings.database.restore.confirmTitle')}
        message={
          <div>
            <p>
              {t('settings.database.restore.confirmMessage')}
            </p>
            {restorePassword && (
              <p style={{ marginTop: '0.75rem', color: 'var(--primary-color)', fontSize: '0.875rem' }}>
                <strong>{t('settings.database.restore.encryptedBackup')}:</strong> {t('settings.database.restore.passwordEntered')}
              </p>
            )}
            <p className="warning-text" style={{ marginTop: '1rem' }}>
              <strong>{t('common.warning')}:</strong> {t('settings.database.restore.warningMessage')}
            </p>
            <p className="warning-text" style={{ marginTop: '0.5rem' }}>
              {t('settings.database.restore.restartRequired')}
            </p>
          </div>
        }
        confirmText={t('settings.restoreDatabase')}
        cancelText={t('common.cancel')}
        type="danger"
        loading={restoring}
      />

      {/* Settings Password Modal for Non-Admin Users */}
      <PasswordModal
        isOpen={showSettingsPasswordModal}
        onClose={() => {
          setShowSettingsPasswordModal(false);
          setSettingsPassword('');
        }}
        onConfirm={handleSettingsPasswordConfirm}
        title={t('settings.enterPasswordToAccess')}
        message={t('settings.enterPasswordToAccessDesc')}
        placeholder={t('settings.enterPassword')}
        required={true}
      />

      {/* Backup Password Modal */}
      <PasswordModal
        isOpen={showBackupPasswordModal}
        onClose={() => setShowBackupPasswordModal(false)}
        onConfirm={handleConfirmBackupPassword}
        title={t('settings.database.backup.encryptTitle')}
        message={t('settings.database.backup.encryptMessage')}
        placeholder={t('settings.database.backup.encryptPlaceholder')}
        required={false}
        loading={backingUp}
      />

      {/* Restore Password Modal */}
      <PasswordModal
        isOpen={showRestorePasswordModal}
        onClose={() => {
          setShowRestorePasswordModal(false);
          setRestoreFilePath('');
          setRestorePassword('');
        }}
        onConfirm={handleConfirmRestorePassword}
        title={t('settings.database.restore.enterPasswordTitle')}
        message={t('settings.database.restore.encryptedBackupMessage')}
        placeholder={t('settings.database.restore.enterPasswordPlaceholder')}
        required={true}
        loading={restoring}
      />
    </div>
  );
}
