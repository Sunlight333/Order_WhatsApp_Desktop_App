import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { configService } from './services/config.service';
import { updateApiBaseUrl } from './lib/api';
import './i18n/config'; // Initialize i18n
import i18n from './i18n/config';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import CreateOrderPage from './pages/CreateOrderPage';
import OrderDetailPage from './pages/OrderDetailPage';
import EditOrderPage from './pages/EditOrderPage';
import UsersPage from './pages/UsersPage';
import SuppliersPage from './pages/SuppliersPage';
import ProductsPage from './pages/ProductsPage';
import CustomersPage from './pages/CustomersPage';
import SettingsPage from './pages/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Toaster from './components/Toaster';
import './styles/index.css';

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Initialize config service and update API base URL
    const initConfig = async () => {
      try {
        const config = await configService.loadConfig();
        
        // Apply theme from config
        if (config.theme) {
          const root = document.documentElement;
          if (config.theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            // Sync localStorage with config
            localStorage.removeItem('theme');
          } else {
            root.setAttribute('data-theme', config.theme);
            // Sync localStorage with config
            localStorage.setItem('theme', config.theme);
          }
        }
        
        // Apply language from config if available
        if (config.language && i18n.language !== config.language) {
          i18n.changeLanguage(config.language);
        }
        
        // Update API base URL after config is loaded
        updateApiBaseUrl();
        
        // Check authentication AFTER config is loaded
        // This ensures API calls use the correct server address
        checkAuth();
      } catch (error) {
        console.error('Failed to initialize config:', error);
        // Still try to check auth even if config fails
        checkAuth();
      }
    };

    initConfig();
  }, [checkAuth]);

  // Disable default browser context menu globally (except for form inputs)
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Allow default context menu for form inputs, textareas, and code blocks
      // This allows users to access browser features like paste, select all, etc. in text fields
      const isEditableElement = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('[contenteditable="true"]');
      
      // Allow default context menu for links
      const isLink = target.tagName === 'A' || target.closest('a');
      
      // Allow default context menu for images
      const isImage = target.tagName === 'IMG';
      
      if (!isEditableElement && !isLink && !isImage) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <MainLayout>
                <OrdersPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/create"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CreateOrderPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <OrderDetailPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id/edit"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EditOrderPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SuppliersPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProductsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <MainLayout>
                <UsersPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CustomersPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        {/* Public settings route - accessible without login */}
        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <MainLayout>
                <SettingsPage />
              </MainLayout>
            ) : (
              <SettingsPage />
            )
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

