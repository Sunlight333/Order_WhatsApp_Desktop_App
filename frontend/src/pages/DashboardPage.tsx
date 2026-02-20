import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, AlertTriangle, Clock, CheckCircle, TrendingUp, ArrowRight, BarChart3, Users, Star, Download, Send, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { exportMultipleSheets } from '../utils/excelExport';
import { useOrderStatusConfig, getStatusConfig } from '../hooks/useOrderStatusConfig';
import '../styles/dashboard.css';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  receivedOrders: number;
  notifiedOrders: number;
  readyToSendOrders: number;
  incompleteOrders: number;
  recentOrders: Array<{
    id: string;
    orderNumber?: number;
    customerName?: string;
    customerPhone: string;
    status: string;
    createdAt: string;
  }>;
}

interface TopProduct {
  reference: string;
  totalQuantity: number;
  orderCount: number;
  supplierName: string;
}

interface TopCustomer {
  customerId: string;
  customerName: string;
  orderCount: number;
  totalAmount: number;
}


export default function DashboardPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    receivedOrders: 0,
    notifiedOrders: 0,
    readyToSendOrders: 0,
    incompleteOrders: 0,
    recentOrders: [],
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const { config: statusConfig } = useOrderStatusConfig();

  useEffect(() => {
    fetchDashboardData();
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // For the "Notified" card we want a daily counter (resets every day).
      // Send date-only strings so the backend can parse them as local day boundaries.
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      // Fetch orders with filters to calculate stats
      // Only "Notified" uses daily counter (resets every day), others show total count
      // Recent orders are filtered by current user (createdById)
      const currentUserId = user?.id;
      const [allOrdersRes, pendingRes, receivedRes, notifiedRes, readyToSendRes, incompleteRes, recentRes] = await Promise.all([
        api.get('/orders', { params: { limit: 1 } }),
        // Pending: total count (no date filter)
        api.get('/orders', { params: { status: 'PENDING', limit: 1 } }),
        // Received: total count (no date filter)
        api.get('/orders', { params: { status: 'RECEIVED', limit: 1 } }),
        // Notified: filter by status and notification date (today) - daily reset
        api.get('/orders', { params: { status: 'NOTIFIED_CALL,NOTIFIED_WHATSAPP', notifiedDateFrom: todayStr, notifiedDateTo: todayStr, limit: 1 } }),
        // Ready to Send: total count (no date filter)
        api.get('/orders', { params: { status: 'READY_TO_SEND', limit: 1 } }),
        // Incomplete: total count (no date filter)
        api.get('/orders', { params: { status: 'INCOMPLETO', limit: 1 } }),
        // Recent orders: filtered by current user
        api.get('/orders', { params: { limit: 5, sortBy: 'createdAt', sortOrder: 'desc', createdById: currentUserId } }),
      ]);

      // Get totals from pagination metadata if available
      const totalOrders = allOrdersRes.data?.data?.pagination?.total || 0;
      const pendingOrders = pendingRes.data?.data?.pagination?.total || 0;
      const receivedOrders = receivedRes.data?.data?.pagination?.total || 0;
      const notifiedOrders = notifiedRes.data?.data?.pagination?.total || 0;
      const readyToSendOrders = readyToSendRes.data?.data?.pagination?.total || 0;
      const incompleteOrders = incompleteRes.data?.data?.pagination?.total || 0;
      const recentOrders = recentRes.data?.data?.orders || [];

      setStats({
        totalOrders,
        pendingOrders,
        receivedOrders,
        notifiedOrders,
        readyToSendOrders,
        incompleteOrders,
        recentOrders,
      });
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error(t('dashboard.failedToLoadStats'));
    } finally {
      setLoading(false);
    }
  };

  // If the app stays open across midnight, refresh the dashboard shortly after the day changes
  // so the "Notified" daily counter resets automatically.
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5, 0); // +5s buffer
    const msUntil = nextMidnight.getTime() - now.getTime();
    const timer = window.setTimeout(() => {
      fetchDashboardData();
    }, Math.max(msUntil, 1000));
    return () => window.clearTimeout(timer);
  }, [isAdmin]);

  const getStatusLabel = (status: string) => {
    // Normalize status to uppercase to handle any case variations
    const normalizedStatus = status.toUpperCase().trim();
    
    // Always use translations for labels to support i18n
    switch (normalizedStatus) {
      case 'PENDING':
        return t('orders.statusPending');
      case 'RECEIVED':
        return t('orders.statusReceived');
      case 'NOTIFIED_CALL':
        return t('orders.statusNotifiedCall');
      case 'NOTIFIED_WHATSAPP':
        return t('orders.statusNotifiedWhatsApp');
      case 'READY_TO_SEND':
        return t('orders.statusReadyToSend');
      case 'SENT':
        return t('orders.statusSent');
      case 'DELIVERED_COUNTER':
        return t('orders.statusDeliveredCounter');
      case 'CANCELLED':
        return t('orders.statusCancelled');
      case 'INCOMPLETO':
        return t('orders.statusIncompleto');
      default:
        // Fallback: try to translate if it's a known status key
        const statusKey = `orders.status${normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())}`;
        const translated = t(statusKey, { defaultValue: normalizedStatus });
        // Only return the original status if translation truly failed (same as key)
        return translated !== statusKey ? translated : normalizedStatus;
    }
  };

  const getStatusStyle = (status: string) => {
    // Normalize status to uppercase to match config keys
    const normalizedStatus = status.toUpperCase().trim();
    const config = getStatusConfig(normalizedStatus, statusConfig);
    return {
      color: config.color || '#6b7280',
      backgroundColor: config.backgroundColor || '#f3f4f6',
      fontFamily: config.fontFamily || 'inherit',
      fontSize: config.fontSize || 'inherit',
      fontWeight: config.fontWeight || '600',
    };
  };

  const fetchAnalytics = async () => {
    if (!isAdmin) return;
    
    try {
      setAnalyticsLoading(true);
      const [productsRes, customersRes] = await Promise.all([
        api.get('/analytics/top-products', { params: { limit: 10 } }),
        api.get('/analytics/top-customers', { params: { limit: 10 } }),
      ]);

      setTopProducts(productsRes.data.data || []);
      setTopCustomers(customersRes.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      // Don't show error toast for analytics, it's not critical
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const handleExportAnalytics = async () => {
    try {
      const sheets = [];
      
      // Add statistics sheet
      sheets.push({
        name: t('dashboard.statistics'),
        data: [
          {
            [t('dashboard.pending')]: stats.pendingOrders,
            [t('dashboard.received')]: stats.receivedOrders,
            [t('dashboard.notified')]: stats.notifiedOrders,
            [t('dashboard.totalOrders')]: stats.totalOrders,
          },
        ],
      });

      // Add top products sheet
      if (topProducts.length > 0) {
        sheets.push({
          name: t('dashboard.topProducts'),
          data: topProducts.map((product) => ({
            [t('products.reference')]: product.reference,
            [t('products.supplier')]: product.supplierName,
            [t('dashboard.totalQuantity')]: product.totalQuantity,
            [t('dashboard.orderCount')]: product.orderCount,
          })),
        });
      }

      // Add top customers sheet
      if (topCustomers.length > 0) {
        sheets.push({
          name: t('dashboard.topCustomers'),
          data: topCustomers.map((customer) => ({
            [t('orders.customerName')]: customer.customerName,
            [t('dashboard.orderCount')]: customer.orderCount,
            [t('dashboard.totalAmount')]: customer.totalAmount,
          })),
        });
      }

      // Fetch and add orders by month sheet
      let ordersByMonthAdded = false;
      try {
        const ordersByMonthRes = await api.get('/analytics/orders-by-month');
        if (ordersByMonthRes.data?.success) {
          const ordersData = ordersByMonthRes.data.data || [];
          if (ordersData.length > 0) {
            sheets.push({
              name: t('dashboard.ordersByMonth'),
              data: ordersData.map((item: any) => ({
                [t('dashboard.month')]: item.monthName || item.month,
                [t('dashboard.orderCount')]: item.count,
              })),
            });
            ordersByMonthAdded = true;
            toast.success(`${t('dashboard.ordersByMonth')}: ${ordersData.length} ${t('dashboard.month')}s`);
          } else {
            // Add empty sheet with headers
            sheets.push({
              name: t('dashboard.ordersByMonth'),
              data: [{
                [t('dashboard.month')]: '',
                [t('dashboard.orderCount')]: '',
              }],
            });
            ordersByMonthAdded = true;
            toast(`${t('dashboard.ordersByMonth')}: ${t('dashboard.noData')}`, { icon: 'ℹ️' });
          }
        } else {
          toast.error(`${t('dashboard.ordersByMonth')}: ${t('dashboard.exportFailed')}`);
        }
      } catch (error: any) {
        const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
        toast.error(`${t('dashboard.ordersByMonth')}: ${errorMsg}`);
        // Still add empty sheet so user knows it was attempted
        sheets.push({
          name: t('dashboard.ordersByMonth'),
          data: [{
            [t('dashboard.month')]: '',
            [t('dashboard.orderCount')]: '',
          }],
        });
      }

      // Fetch and add quantity by reference sheet
      let quantityByRefAdded = false;
      try {
        const quantityByRefRes = await api.get('/analytics/quantity-by-reference');
        if (quantityByRefRes.data?.success) {
          const quantityData = quantityByRefRes.data.data || [];
          if (quantityData.length > 0) {
            sheets.push({
              name: t('dashboard.quantityByReference'),
              data: quantityData.map((item: any) => ({
                [t('products.reference')]: item.reference,
                [t('products.supplier')]: item.supplierName,
                [t('dashboard.totalQuantity')]: item.totalQuantity,
                [t('dashboard.orderCount')]: item.orderCount,
              })),
            });
            quantityByRefAdded = true;
            toast.success(`${t('dashboard.quantityByReference')}: ${quantityData.length} ${t('products.reference')}s`);
          } else {
            // Add empty sheet with headers
            sheets.push({
              name: t('dashboard.quantityByReference'),
              data: [{
                [t('products.reference')]: '',
                [t('products.supplier')]: '',
                [t('dashboard.totalQuantity')]: '',
                [t('dashboard.orderCount')]: '',
              }],
            });
            quantityByRefAdded = true;
            toast(`${t('dashboard.quantityByReference')}: ${t('dashboard.noData')}`, { icon: 'ℹ️' });
          }
        } else {
          toast.error(`${t('dashboard.quantityByReference')}: ${t('dashboard.exportFailed')}`);
        }
      } catch (error: any) {
        const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
        toast.error(`${t('dashboard.quantityByReference')}: ${errorMsg}`);
        // Still add empty sheet so user knows it was attempted
        sheets.push({
          name: t('dashboard.quantityByReference'),
          data: [{
            [t('products.reference')]: '',
            [t('products.supplier')]: '',
            [t('dashboard.totalQuantity')]: '',
            [t('dashboard.orderCount')]: '',
          }],
        });
      }

      if (sheets.length === 0) {
        toast.error(t('dashboard.noDataToExport'));
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      exportMultipleSheets(sheets, `analytics_${timestamp}`);
      toast.success(t('dashboard.analyticsExported'));
    } catch (error: any) {
      console.error('Failed to export analytics:', error);
      toast.error(t('dashboard.exportFailed'));
    }
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>{t('dashboard.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>{t('dashboard.title')}</h1>
        <p className="dashboard-subtitle">{t('dashboard.welcome')}</p>
      </div>

      {/* Statistics Cards */}
      <div className="dashboard-stats-grid">
        {/* Total Orders card removed per requirements - not necessary to see number of orders */}
        <div 
          className="stat-card stat-card-warning"
          onClick={() => {
            navigate(`/orders?status=PENDING`);
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-icon">
            <Clock size={32} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">{t('dashboard.pending')}</div>
            <div className="stat-card-value">{stats.pendingOrders}</div>
          </div>
        </div>

        <div 
          className="stat-card stat-card-info"
          onClick={() => {
            navigate(`/orders?status=RECEIVED`);
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-icon">
            <AlertTriangle size={32} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">{t('dashboard.received')}</div>
            <div className="stat-card-value">{stats.receivedOrders}</div>
          </div>
        </div>

        <div 
          className="stat-card stat-card-success"
          onClick={() => {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            navigate(`/orders?status=NOTIFIED_CALL,NOTIFIED_WHATSAPP&notifiedDateFrom=${today}&notifiedDateTo=${today}`);
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-icon">
            <CheckCircle size={32} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">{t('dashboard.notified')}</div>
            <div className="stat-card-value">{stats.notifiedOrders}</div>
          </div>
        </div>

        <div 
          className="stat-card stat-card-info"
          onClick={() => {
            navigate(`/orders?status=READY_TO_SEND`);
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-icon">
            <Send size={32} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">{t('dashboard.readyToSend')}</div>
            <div className="stat-card-value">{stats.readyToSendOrders}</div>
          </div>
        </div>

        <div 
          className="stat-card stat-card-danger"
          onClick={() => {
            navigate(`/orders?status=INCOMPLETO`);
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-icon">
            <AlertCircle size={32} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">{t('orders.statusIncompleto')}</div>
            <div className="stat-card-value">{stats.incompleteOrders}</div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h2>
            {t('dashboard.recentOrders')}{' '}
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
              {t('dashboard.byUser', { username: user?.username?.toUpperCase() || '' })}
            </span>
          </h2>
          <button
            className="btn-link"
            onClick={() => navigate('/orders')}
          >
            {t('dashboard.viewAll')} <ArrowRight size={16} />
          </button>
        </div>

        {stats.recentOrders.length === 0 ? (
          <div className="dashboard-empty-state">
            <Package size={48} />
            <p>{t('dashboard.noOrders')}</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/orders/create')}
            >
              {t('dashboard.createFirstOrder')}
            </button>
          </div>
        ) : (
          <div className="recent-orders-list">
            {stats.recentOrders.map((order) => (
              <div
                key={order.id}
                className="recent-order-item"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div className="recent-order-main">
                  <div className="recent-order-info">
                    <span className="recent-order-id">{order.orderNumber || `#${order.id.slice(0, 8)}`}</span>
                    <span className="recent-order-customer">
                      {order.customerName || order.customerPhone}
                    </span>
                  </div>
                  <span 
                    className="status-badge status-custom"
                    style={getStatusStyle(order.status)}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="recent-order-date">
                  {formatDate(order.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2>{t('dashboard.quickActions')}</h2>
        <div className="quick-actions-grid">
          <button
            className="quick-action-card"
            onClick={() => navigate('/orders/create')}
          >
            <div className="quick-action-icon">
              <TrendingUp size={24} />
            </div>
            <div className="quick-action-content">
              <div className="quick-action-title">{t('dashboard.createNewOrder')}</div>
              <div className="quick-action-description">{t('dashboard.createNewOrderDesc')}</div>
            </div>
            <ArrowRight size={20} className="quick-action-arrow" />
          </button>

          <button
            className="quick-action-card"
            onClick={() => navigate('/orders')}
          >
            <div className="quick-action-icon">
              <Package size={24} />
            </div>
            <div className="quick-action-content">
              <div className="quick-action-title">{t('dashboard.viewAllOrders')}</div>
              <div className="quick-action-description">{t('dashboard.viewAllOrdersDesc')}</div>
            </div>
            <ArrowRight size={20} className="quick-action-arrow" />
          </button>
        </div>
      </div>

      {/* Analytics Section - Only for Admin */}
      {isAdmin && (
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>
              <BarChart3 size={24} style={{ marginRight: '0.5rem', display: 'inline-block' }} />
              {t('dashboard.analytics')}
            </h2>
            <button
              className="btn-secondary"
              onClick={handleExportAnalytics}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={16} />
              {t('dashboard.exportAnalytics')}
            </button>
          </div>

          {analyticsLoading ? (
            <div className="dashboard-loading">
              <div className="loading-spinner"></div>
              <p>{t('dashboard.loadingAnalytics')}</p>
            </div>
          ) : (
            <div className="analytics-grid">
              {/* Top Products */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <Star size={20} />
                  <h3>{t('dashboard.topProducts')}</h3>
                </div>
                <div className="analytics-table">
                  {topProducts.length === 0 ? (
                    <p className="analytics-empty">{t('dashboard.noData')}</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>{t('products.reference')}</th>
                          <th>{t('products.supplier')}</th>
                          <th>{t('dashboard.totalQuantity')}</th>
                          <th>{t('dashboard.orderCount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((product, index) => {
                          const safeTotalQuantity = Number(product.totalQuantity ?? 0);
                          return (
                            <tr key={`${product.reference}-${index}`}>
                              <td>
                                <strong style={{ color: 'var(--primary)', cursor: 'pointer' }}>
                                  {product.reference}
                                </strong>
                              </td>
                              <td>{product.supplierName}</td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                {Math.round(safeTotalQuantity)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ 
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  background: 'var(--primary-light)',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: 'var(--primary)'
                                }}>
                                  {product.orderCount}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Top Customers */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <Users size={20} />
                  <h3>{t('dashboard.topCustomers')}</h3>
                </div>
                <div className="analytics-table">
                  {topCustomers.length === 0 ? (
                    <p className="analytics-empty">{t('dashboard.noData')}</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>{t('orders.customerName')}</th>
                          <th>{t('dashboard.orderCount')}</th>
                          <th>{t('dashboard.totalAmount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCustomers.map((customer) => {
                          const safeTotalAmount = Number(customer.totalAmount ?? 0);
                          return (
                            <tr key={customer.customerId}>
                              <td>
                                <strong style={{ color: 'var(--primary)', cursor: 'pointer' }}>
                                  {customer.customerName}
                                </strong>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ 
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  background: 'var(--primary-light)',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: 'var(--primary)'
                                }}>
                                  {customer.orderCount}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--success)' }}>
                                €{safeTotalAmount.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
