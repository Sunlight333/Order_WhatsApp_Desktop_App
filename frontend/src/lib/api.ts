import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { configService } from '../services/config.service';

// Get API base URL from config service or fallback to environment variable
function getApiBaseUrl(): string {
  try {
    const config = configService.getConfig();
    if (config) {
      const url = configService.getApiBaseUrl();
      console.log('🔗 API Base URL from config:', url, 'Mode:', config.mode, 'Server:', config.serverAddress);
      return url;
    }
  } catch (error) {
    console.warn('⚠️  Config service error:', error);
  }
  // Fallback if config service is not ready
  const fallbackUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
  console.log('🔗 API Base URL (fallback):', fallbackUrl);
  return fallbackUrl;
}

// Create axios instance with initial base URL
// This will be updated dynamically by the request interceptor
export const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to update API base URL (called after config loads)
export function updateApiBaseUrl() {
  try {
    const newBaseUrl = configService.getApiBaseUrl();
    const config = configService.getConfig();
    if (newBaseUrl && api.defaults.baseURL !== newBaseUrl) {
      api.defaults.baseURL = newBaseUrl;
      console.log('🔗 Updated API Base URL to:', newBaseUrl, 'Mode:', config?.mode, 'Server:', config?.serverAddress);
    } else if (config) {
      console.log('🔗 API Base URL already set:', newBaseUrl, 'Mode:', config.mode, 'Server:', config.serverAddress);
    }
  } catch (error) {
    // Ignore if config service not available
    console.warn('⚠️  Could not update API base URL:', error);
  }
}

// Subscribe to config changes to update base URL
configService.subscribe(() => {
  updateApiBaseUrl();
});

// Request interceptor - Update base URL dynamically and add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Dynamically update base URL from config service on every request
    // This ensures client mode uses the correct server address
    try {
      const currentBaseUrl = configService.getApiBaseUrl();
      const appConfig = configService.getConfig();
      
      if (currentBaseUrl) {
        // Always update to ensure we have the latest config
        config.baseURL = currentBaseUrl;
        // Also update the instance default for consistency
        if (api.defaults.baseURL !== currentBaseUrl) {
          api.defaults.baseURL = currentBaseUrl;
          console.log('🔗 Request interceptor updated API Base URL to:', currentBaseUrl, 'Mode:', appConfig?.mode, 'Server:', appConfig?.serverAddress);
        }
      }
    } catch (error) {
      // Config service not available, use existing baseURL
      console.warn('⚠️  Could not get API base URL from config service:', error);
    }
    
    // Add auth token
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors and connection issues
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error: { code: string; message: string } }>) => {
    // Handle connection refused errors (server not started)
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
      console.error('❌ Cannot connect to server. Is the backend server running?');
      // Don't redirect on connection errors - let the user see the error
      return Promise.reject({
        ...error,
        message: 'Cannot connect to server. Please ensure the application is running correctly.',
        isConnectionError: true,
      });
    }
    
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

