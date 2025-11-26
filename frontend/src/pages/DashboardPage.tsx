import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Clock, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import '../styles/dashboard.css';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  receivedOrders: number;
  notifiedOrders: number;
  recentOrders: Array<{
    id: string;
    customerName?: string;
    customerPhone: string;
    status: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    receivedOrders: 0,
    notifiedOrders: 0,
    recentOrders: [],
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch orders with filters to calculate stats
      const [allOrdersRes, pendingRes, receivedRes, notifiedRes, recentRes] = await Promise.all([
        api.get('/orders', { params: { limit: 1 } }),
        api.get('/orders', { params: { status: 'PENDING', limit: 1 } }),
        api.get('/orders', { params: { status: 'RECEIVED', limit: 1 } }),
        api.get('/orders', { params: { status: 'NOTIFIED', limit: 1 } }),
        api.get('/orders', { params: { limit: 5, sortBy: 'createdAt', sortOrder: 'desc' } }),
      ]);

      // Get totals from pagination metadata if available
      const totalOrders = allOrdersRes.data?.data?.pagination?.total || 0;
      const pendingOrders = pendingRes.data?.data?.pagination?.total || 0;
      const receivedOrders = receivedRes.data?.data?.pagination?.total || 0;
      const notifiedOrders = notifiedRes.data?.data?.pagination?.total || 0;
      const recentOrders = recentRes.data?.data?.orders || [];

      setStats({
        totalOrders,
        pendingOrders,
        receivedOrders,
        notifiedOrders,
        recentOrders,
      });
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'status-badge status-pending';
      case 'RECEIVED':
        return 'status-badge status-received';
      case 'NOTIFIED':
        return 'status-badge status-notified';
      default:
        return 'status-badge';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">Welcome to Order Management System</p>
      </div>

      {/* Statistics Cards */}
      <div className="dashboard-stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-card-icon">
            <Package size={32} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Total Orders</div>
            <div className="stat-card-value">{stats.totalOrders}</div>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-card-icon">
            <Clock size={32} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Pending</div>
            <div className="stat-card-value">{stats.pendingOrders}</div>
          </div>
        </div>

        <div className="stat-card stat-card-info">
          <div className="stat-card-icon">
            <ShoppingCart size={32} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Received</div>
            <div className="stat-card-value">{stats.receivedOrders}</div>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-card-icon">
            <CheckCircle size={32} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Notified</div>
            <div className="stat-card-value">{stats.notifiedOrders}</div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h2>Recent Orders</h2>
          <button
            className="btn-link"
            onClick={() => navigate('/orders')}
          >
            View All <ArrowRight size={16} />
          </button>
        </div>

        {stats.recentOrders.length === 0 ? (
          <div className="dashboard-empty-state">
            <Package size={48} />
            <p>No orders yet</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/orders/create')}
            >
              Create Your First Order
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
                    <span className="recent-order-id">#{order.id.slice(0, 8)}</span>
                    <span className="recent-order-customer">
                      {order.customerName || order.customerPhone}
                    </span>
                  </div>
                  <span className={getStatusBadgeClass(order.status)}>
                    {order.status}
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
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          <button
            className="quick-action-card"
            onClick={() => navigate('/orders/create')}
          >
            <div className="quick-action-icon">
              <TrendingUp size={24} />
            </div>
            <div className="quick-action-content">
              <div className="quick-action-title">Create New Order</div>
              <div className="quick-action-description">Add a new order to the system</div>
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
              <div className="quick-action-title">View All Orders</div>
              <div className="quick-action-description">Browse and manage all orders</div>
            </div>
            <ArrowRight size={20} className="quick-action-arrow" />
          </button>
        </div>
      </div>
    </div>
  );
}
