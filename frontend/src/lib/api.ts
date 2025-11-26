import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Get API base URL from config service or fallback to environment variable
function getApiBaseUrl(): string {
  try {
    // Dynamic import to avoid circular dependencies
    const { configService } = require('../services/config.service');
    const config = configService.getConfig();
    if (config) {
      return configService.getApiBaseUrl();
    }
  } catch (error) {
    // Config service not ready yet
  }
  // Fallback if config service is not ready
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
}

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to update API base URL (called after config loads)
export function updateApiBaseUrl() {
  try {
    const { configService } = require('../services/config.service');
    api.defaults.baseURL = configService.getApiBaseUrl();
  } catch (error) {
    // Ignore if config service not available
  }
}

// Subscribe to config changes to update base URL
try {
  const { configService } = require('../services/config.service');
  configService.subscribe(() => {
    updateApiBaseUrl();
  });
} catch (error) {
  // Config service might not be initialized yet
}

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error: { code: string; message: string } }>) => {
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

