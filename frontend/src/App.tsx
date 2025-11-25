import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import CreateOrderPage from './pages/CreateOrderPage';
import OrderDetailPage from './pages/OrderDetailPage';
import EditOrderPage from './pages/EditOrderPage';
import UsersPage from './pages/UsersPage';
import SuppliersPage from './pages/SuppliersPage';
import ProductsPage from './pages/ProductsPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Toaster from './components/Toaster';
import './styles/index.css';

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Check authentication on app load
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/orders" replace /> : <LoginPage />}
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/orders" replace />
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
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <div className="page-container">
                  <h1>Settings</h1>
                  <p>Settings page will be implemented in Phase 5</p>
                </div>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

