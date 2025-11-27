import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Loader2, X, ChevronLeft, ChevronRight, MessageSquare, Phone, Eye, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useDebounce } from '../hooks/useDebounce';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import { getWhatsAppMessage, openWhatsApp } from '../utils/whatsapp';
import WhatsAppModal from '../components/WhatsAppModal';

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
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState<string>('');

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    fetchOrders();
  }, [debouncedSearch, statusFilter, page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 50,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await api.get<{
        success: true;
        data: {
          orders: Order[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
        };
      }>('/orders', { params });
      
      setOrders(response.data.data.orders || []);
      setPagination(response.data.data.pagination);
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

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPage(1);
  };

  const hasActiveFilters = searchQuery.trim() || statusFilter;

  const handleRowRightClick = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedOrder(order);
    showContextMenu(e, order);
  };

  const handleWhatsAppAction = async () => {
    if (!selectedOrder) return;
    
    try {
      const message = await getWhatsAppMessage();
      setWhatsappMessage(message);
      setShowWhatsAppModal(true);
    } catch (error: any) {
      toast.error('Failed to load WhatsApp message');
    }
  };

  const confirmWhatsAppSend = async (message: string) => {
    if (!selectedOrder) return;
    setShowWhatsAppModal(false);

    try {
      await openWhatsApp(selectedOrder.customerPhone, message);
      
      // Update status after a delay
      setTimeout(async () => {
        try {
          await api.patch(`/orders/${selectedOrder.id}/status`, {
            status: 'NOTIFIED_WHATSAPP',
            notificationMethod: 'WHATSAPP',
          });
          toast.success('Order status updated to Notified (WhatsApp)');
          fetchOrders(); // Refresh orders
        } catch (error: any) {
          console.error('Failed to update status:', error);
        }
      }, 2000);
    } catch (error: any) {
      toast.error('Failed to open WhatsApp');
    }
  };

  const handleCallAction = async () => {
    if (!selectedOrder) return;
    const telUrl = `tel:${selectedOrder.customerPhone}`;
    
    if (window.electron?.openExternal) {
      await window.electron.openExternal(telUrl);
    } else {
      window.location.href = telUrl;
    }
  };

  const handleCopyOrderId = () => {
    if (!selectedOrder) return;
    navigator.clipboard.writeText(selectedOrder.id);
    toast.success('Order ID copied to clipboard');
  };

  const handleCopyPhone = () => {
    if (!selectedOrder) return;
    navigator.clipboard.writeText(selectedOrder.customerPhone);
    toast.success('Phone number copied to clipboard');
  };

  const getContextMenuItems = (order: Order): ContextMenuItem[] => {
    return [
      {
        label: 'View Details',
        icon: <Eye size={16} />,
        action: () => navigate(`/orders/${order.id}`),
      },
      {
        label: 'Send WhatsApp Message',
        icon: <MessageSquare size={16} />,
        action: handleWhatsAppAction,
      },
      {
        label: 'Make Phone Call',
        icon: <Phone size={16} />,
        action: handleCallAction,
      },
      { divider: true },
      {
        label: 'Copy Order ID',
        icon: <Copy size={16} />,
        action: handleCopyOrderId,
      },
      {
        label: 'Copy Phone Number',
        icon: <Copy size={16} />,
        action: handleCopyPhone,
      },
    ];
  };

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
              <X size={16} />
            </button>
          )}
        </div>
        <div className="toolbar-actions">
          {hasActiveFilters && (
            <button className="btn-secondary btn-sm" onClick={clearFilters}>
              <X size={16} />
              Clear Filters
            </button>
          )}
          <button
            className={`btn-secondary ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="RECEIVED">Received</option>
              <option value="NOTIFIED_CALL">Notified (Call)</option>
              <option value="NOTIFIED_WHATSAPP">Notified (WhatsApp)</option>
            </select>
          </div>
          {hasActiveFilters && (
            <div className="active-filters">
              <span className="filter-label">Active filters:</span>
              {searchQuery && (
                <span className="filter-tag">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {statusFilter && (
                <span className="filter-tag">
                  Status: {getStatusLabel(statusFilter)}
                  <button onClick={() => handleStatusFilterChange('')}>
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {orders.length === 0 && !loading ? (
        <div className="empty-state">
          <p>No orders found</p>
          {hasActiveFilters ? (
            <button className="btn-secondary" onClick={clearFilters}>
              Clear Filters
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => navigate('/orders/create')}
            >
              <Plus size={20} />
              Create First Order
            </button>
          )}
        </div>
      ) : (
        <>
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
                {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  onContextMenu={(e) => handleRowRightClick(e, order)}
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || loading}
              >
                <ChevronLeft size={18} />
                Previous
              </button>
              <div className="pagination-info">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === pagination.totalPages || loading}
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Context Menu */}
      <ContextMenu
        items={selectedOrder ? getContextMenuItems(selectedOrder) : []}
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        onClose={hideContextMenu}
      />

      {/* WhatsApp Confirmation Modal */}
      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onConfirm={confirmWhatsAppSend}
        phoneNumber={selectedOrder?.customerPhone || ''}
        initialMessage={whatsappMessage}
      />
    </div>
  );
}

