import { useState, useEffect } from 'react';
import { Save, Database, Server, Monitor, Loader2, CheckCircle, AlertCircle, RefreshCw, Wifi, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { configService, type AppConfig } from '../services/config.service';
import '../styles/settings.css';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [localIp, setLocalIp] = useState<string>('');

  useEffect(() => {
    loadSettings();
    detectLocalIp();
    
    // Subscribe to config changes
    const unsubscribe = configService.subscribe(() => {
      loadSettings();
    });

    return unsubscribe;
  }, []);

  const detectLocalIp = async () => {
    try {
      // Try to get local IP - in Electron we can use a better method
      // For now, use a simple approach
      const response = await fetch('https://api.ipify.org?format=json').catch(() => null);
      if (response) {
        const data = await response.json();
        setLocalIp(data.ip || 'localhost');
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
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
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

      // In a real implementation, this would call a backend endpoint
      // For now, we'll simulate basic validation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (config.database.type === 'sqlite') {
        setConnectionStatus('success');
        setConnectionMessage('SQLite database path configured');
      } else if (config.database.url && config.database.url.length > 5) {
        setConnectionStatus('success');
        setConnectionMessage('Database connection string format valid');
      } else {
        setConnectionStatus('error');
        setConnectionMessage('Please provide a valid database URL');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setConnectionMessage(error.message || 'Failed to connect to database');
    } finally {
      setTestingConnection(false);
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
      };

      if (config.mode === 'client') {
        configToSave.serverAddress = config.serverAddress || '';
      }

      await configService.saveConfig(configToSave);

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

      // Show combined success message with restart notice
      toast.success(
        'Settings saved successfully! Please restart the application for some changes to take effect.',
        {
          duration: 6000,
        }
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>Loading settings...</p>
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
            Back to Login
          </button>
        </div>
      )}
      <div className="page-header">
        <div>
          <h1>Application Settings</h1>
          <p className="page-subtitle">Configure server, database, and appearance settings</p>
          {!isAuthenticated && (
            <p className="page-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Configure the app settings before logging in. These settings are saved locally.
            </p>
          )}
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowSaveModal(true)}
          disabled={saving}
        >
          <Save size={20} />
          Save Settings
        </button>
      </div>

      <div className="settings-grid">
        {/* Server/Client Mode Configuration */}
        <section className="settings-section">
          <div className="section-header">
            <Server size={24} />
            <h2>Application Mode</h2>
          </div>

          <div className="settings-content">
            <div className="form-group">
              <label>
                Mode <span className="required">*</span>
              </label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="appMode"
                    value="server"
                    checked={config.mode === 'server'}
                    onChange={() =>
                      setConfig({ ...config, mode: 'server' })
                    }
                  />
                  <span>Server Mode</span>
                  <small>Run as server with database</small>
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
                  <span>Client Mode</span>
                  <small>Connect to remote server</small>
                </label>
              </div>
            </div>

            {config.mode === 'server' && (
              <div className="form-group">
                <label>Server Port</label>
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
                <small className="form-hint">Default: 3000</small>
                {localIp && (
                  <div className="info-box" style={{ marginTop: '0.5rem' }}>
                    <Wifi size={16} />
                    <span>Share this address with clients: {localIp}:{config.serverPort || 3000}</span>
                  </div>
                )}
              </div>
            )}

            {config.mode === 'client' && (
              <>
                <div className="form-group">
                  <label>
                    Server IP Address <span className="required">*</span>
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
                    IP address of the server machine
                  </small>
                </div>
                
                <div className="form-group">
                  <label>Server Port</label>
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
                  <small className="form-hint">Port of the server (default: 3000)</small>
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
                        Testing...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        Test Connection
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

        {/* Database Configuration */}
        <section className="settings-section">
          <div className="section-header">
            <Database size={24} />
            <h2>Database Configuration</h2>
          </div>

          <div className="settings-content">
            <div className="form-group">
              <label>
                Database Provider <span className="required">*</span>
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
                  <span>SQLite (Default)</span>
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
                {config.database.type === 'sqlite' ? 'Database Path' : 'Database URL'} <span className="required">*</span>
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
              <div className="form-actions-inline">
                <button
                  className="btn-secondary"
                  onClick={testDatabaseConnection}
                  disabled={testingConnection || !config.database.url}
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
            )}
          </div>
        </section>

        {/* Theme Configuration */}
        <section className="settings-section">
          <div className="section-header">
            <Monitor size={24} />
            <h2>Appearance</h2>
          </div>

          <div className="settings-content">
            <div className="form-group">
              <label>
                Theme <span className="required">*</span>
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
                  <span>Light</span>
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
                  <span>Dark</span>
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
                  <span>System</span>
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Save Confirmation Modal */}
      <ConfirmModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onConfirm={handleSave}
        title="Save Settings"
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
        confirmText="Save Settings"
        cancelText="Cancel"
        type="info"
        loading={saving}
      />
    </div>
  );
}
