import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  customerName?: string;
  customerPhone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  suppliers: Array<{ id: string; name: string }>;
  totalAmount?: string;
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get<{
        success: true;
        data: {
          orders: Order[];
          pagination: any;
        };
      }>('/orders');
      setOrders(response.data.data.orders || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'status-yellow';
      case 'NOTIFIED_CALL':
      case 'NOTIFIED_WHATSAPP':
        return 'status-green';
      default:
        return 'status-pending';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'RECEIVED':
        return 'Received';
      case 'NOTIFIED_CALL':
        return 'Notified (Call)';
      case 'NOTIFIED_WHATSAPP':
        return 'Notified (WhatsApp)';
      default:
        return status;
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.customerName?.toLowerCase().includes(query) ||
      order.customerPhone.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p className="page-subtitle">Manage and track all orders</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/orders/create')}
        >
          <Plus size={20} />
          Create Order
        </button>
      </div>

      <div className="orders-toolbar">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <button className="btn-secondary">
          <Filter size={18} />
          Filters
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <p>No orders found</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/orders/create')}
          >
            <Plus size={20} />
            Create First Order
          </button>
        </div>
      ) : (
        <div className="orders-list-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Suppliers</th>
                <th>Total</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="order-row"
                >
                  <td>
                    <span className={`status-badge ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="order-id">{order.id.substring(0, 8)}...</td>
                  <td>{order.customerName || '-'}</td>
                  <td>
                    <a
                      href={`tel:${order.customerPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="phone-link"
                    >
                      {order.customerPhone}
                    </a>
                  </td>
                  <td>{order.suppliers?.length || 0}</td>
                  <td>{order.totalAmount || '-'}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${order.id}`);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

