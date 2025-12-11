import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Loader2, X, ChevronLeft, ChevronRight, MessageSquare, Eye, Copy, ArrowUp, ArrowDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  orderNumber?: number; // Auto-incremental order number (1, 2, 3...)
  customerName?: string;
  customerId?: string;
  customerPhone?: string;
  countryCode?: string;
  status: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
  suppliers: Array<{ id: string; name: string }>;
  totalAmount?: string;
  createdBy?: {
    id: string;
    username: string;
  } | null;
  customer?: {
    id: string;
    name: string;
    phone?: string;
    countryCode?: string;
  } | null;
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
  }, [debouncedSearch, statusFilter, dateFrom, dateTo, page, sortBy, sortOrder]);

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

      if (dateFrom) {
        params.dateFrom = dateFrom;
      }

      if (dateTo) {
        params.dateTo = dateTo;
      }

      if (sortBy) {
        params.sortBy = sortBy;
      }

      if (sortOrder) {
        params.sortOrder = sortOrder;
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
      toast.error(error.response?.data?.error?.message || t('orders.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'status-green';
      case 'NOTIFIED_CALL':
      case 'NOTIFIED_WHATSAPP':
        return 'status-green';
      case 'CANCELLED':
      case 'INCOMPLETO':
        return 'status-red';
      default:
        return 'status-pending';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return t('orders.statusPending');
      case 'RECEIVED':
        return t('orders.statusReceived');
      case 'NOTIFIED_CALL':
        return t('orders.statusNotifiedCall');
      case 'NOTIFIED_WHATSAPP':
        return t('orders.statusNotifiedWhatsApp');
      case 'CANCELLED':
        return t('orders.statusCancelled');
      case 'INCOMPLETO':
        return t('orders.statusIncompleto');
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
    setDateFrom('');
    setDateTo('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to desc
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1); // Reset to first page when sorting changes
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ChevronUp size={14} style={{ opacity: 0.3 }} />;
    }
    return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const hasActiveFilters = searchQuery.trim() || statusFilter || dateFrom || dateTo;

  const handleRowRightClick = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedOrder(order);
    showContextMenu(e, order);
  };

  const handleWhatsAppAction = async (order?: Order) => {
    const targetOrder = order || selectedOrder;
    if (!targetOrder) return;
    
    try {
      setSelectedOrder(targetOrder);
      const message = await getWhatsAppMessage();
      setWhatsappMessage(message);
      setShowWhatsAppModal(true);
    } catch (error: any) {
      toast.error(t('whatsapp.messageFailed'));
    }
  };

  const handlePhoneClick = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();
    handleWhatsAppAction(order);
  };

  const confirmWhatsAppSend = async (message: string) => {
    if (!selectedOrder) return;
    setShowWhatsAppModal(false);

    try {
      const phone = selectedOrder.customerPhone || selectedOrder.customer?.phone;
      if (!phone) {
        toast.error(t('orders.noPhoneNumber'));
        return;
      }
      const countryCode = selectedOrder.countryCode || selectedOrder.customer?.countryCode || '+34';
      const fullPhone = `${countryCode}${phone}`;
      await openWhatsApp(fullPhone, message);
      
      // Update status after a delay
      setTimeout(async () => {
        try {
          await api.patch(`/orders/${selectedOrder.id}/status`, {
            status: 'NOTIFIED_WHATSAPP',
            notificationMethod: 'WHATSAPP',
          });
          toast.success(t('orderDetail.statusUpdatedWhatsApp'));
          fetchOrders(); // Refresh orders
        } catch (error: any) {
          console.error('Failed to update status:', error);
        }
      }, 2000);
    } catch (error: any) {
      toast.error(t('whatsapp.messageFailed'));
    }
  };

  const handleCopyOrderId = () => {
    if (!selectedOrder) return;
    // Copy orderNumber if it exists, otherwise copy the original order ID
    const orderIdToCopy = selectedOrder.orderNumber?.toString() || selectedOrder.id;
    navigator.clipboard.writeText(orderIdToCopy);
    toast.success(t('common.copied'));
  };

  const handleCopyPhone = () => {
    if (!selectedOrder) return;
    const phone = selectedOrder.customerPhone || selectedOrder.customer?.phone;
    if (!phone) {
      toast.error(t('orders.noPhoneNumber'));
      return;
    }
    const countryCode = selectedOrder.countryCode || selectedOrder.customer?.countryCode || '+34';
    const fullPhone = `${countryCode}${phone}`;
    navigator.clipboard.writeText(fullPhone);
    toast.success(t('common.copied'));
  };

  const getContextMenuItems = (order: Order): ContextMenuItem[] => {
    return [
      {
        label: t('orders.viewDetails'),
        icon: <Eye size={16} />,
        action: () => navigate(`/orders/${order.id}`),
      },
      {
        label: t('orders.sendWhatsAppMessage'),
        icon: <MessageSquare size={16} />,
        action: handleWhatsAppAction,
      },
      { divider: true },
      {
        label: t('orders.copyOrderNumber'),
        icon: <Copy size={16} />,
        action: handleCopyOrderId,
      },
      {
        label: t('orders.copyPhoneNumber'),
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
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{t('orders.title')}</h1>
          <p className="page-subtitle">{t('orders.manageOrders')}</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/orders/create')}
        >
          <Plus size={20} />
          {t('orders.createOrder')}
        </button>
      </div>

      <div className="orders-toolbar">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder={t('orders.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search"
              onClick={() => setSearchQuery('')}
              title={t('common.clearSearch')}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="toolbar-actions">
          {hasActiveFilters && (
            <button className="btn-secondary btn-sm" onClick={clearFilters}>
              <X size={16} />
{t('common.clearFilters')}
            </button>
          )}
          <button
            className={`btn-secondary ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            {t('common.filter')}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <label>{t('common.status')}</label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="filter-select"
            >
              <option value="">{t('orders.allStatuses')}</option>
              <option value="PENDING">{t('orders.statusPending')}</option>
              <option value="RECEIVED">{t('orders.statusReceived')}</option>
              <option value="NOTIFIED_CALL">{t('orders.statusNotifiedCall')}</option>
              <option value="NOTIFIED_WHATSAPP">{t('orders.statusNotifiedWhatsApp')}</option>
              <option value="CANCELLED">{t('orders.statusCancelled')}</option>
            </select>
          </div>
          <div className="filter-group">
            <label>{t('orders.dateFrom')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>{t('orders.dateTo')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="filter-input"
              min={dateFrom || undefined}
            />
          </div>
          {hasActiveFilters && (
            <div className="active-filters">
              <span className="filter-label">{t('orders.activeFilters')}:</span>
              {searchQuery && (
                <span className="filter-tag">
                  {t('orders.searchFilter')}: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {statusFilter && (
                <span className="filter-tag">
                  {t('common.status')}: {getStatusLabel(statusFilter)}
                  <button onClick={() => handleStatusFilterChange('')}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {dateFrom && (
                <span className="filter-tag">
                  {t('orders.dateFrom')}: {new Date(dateFrom).toLocaleDateString()}
                  <button onClick={() => {
                    setDateFrom('');
                    setPage(1);
                  }}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {dateTo && (
                <span className="filter-tag">
                  {t('orders.dateTo')}: {new Date(dateTo).toLocaleDateString()}
                  <button onClick={() => {
                    setDateTo('');
                    setPage(1);
                  }}>
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
          <p>{t('orders.noOrders')}</p>
          {hasActiveFilters ? (
            <button className="btn-secondary" onClick={clearFilters}>
{t('common.clearFilters')}
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => navigate('/orders/create')}
            >
              <Plus size={20} />
              {t('orders.createFirstOrder')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="orders-list-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('status')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('common.status')}
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('orderNumber')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('orders.orderNumber')}
                      {getSortIcon('orderNumber')}
                    </div>
                  </th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('customerName')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('orders.customerName')}
                      {getSortIcon('customerName')}
                    </div>
                  </th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('phone')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('common.phone')}
                      {getSortIcon('phone')}
                    </div>
                  </th>
                  <th>{t('orders.suppliers')}</th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('totalAmount')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('orders.total')}
                      {getSortIcon('totalAmount')}
                    </div>
                  </th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('createdBy')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('orders.createdBy')}
                      {getSortIcon('createdBy')}
                    </div>
                  </th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('createdAt')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('orders.createdAt')}
                      {getSortIcon('createdAt')}
                    </div>
                  </th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('updatedAt')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('orders.updatedAt') || 'Last Updated'}
                      {getSortIcon('updatedAt')}
                    </div>
                  </th>
                  <th>{t('orders.hasObservations')}</th>
                  <th>{t('common.actions')}</th>
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
                  <td>
                    <span 
                      className="order-id clickable-copy" 
                      onClick={(e) => {
                        e.stopPropagation();
                        const orderIdToCopy = order.orderNumber?.toString() || order.id;
                        navigator.clipboard.writeText(orderIdToCopy);
                        toast.success(t('common.copied'));
                      }}
                      title={t('orders.clickToCopy')}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {order.orderNumber || '-'}
                    </span>
                  </td>
                  <td>{order.customerName || order.customer?.name || '-'}</td>
                  <td>
                    {(() => {
                      const phone = order.customerPhone || order.customer?.phone;
                      if (!phone) return '-';
                      const fullPhone = order.countryCode || order.customer?.countryCode 
                        ? `${order.countryCode || order.customer?.countryCode} ${phone}`
                        : phone;
                      return (
                        <span
                          className="phone-link clickable-copy"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(fullPhone);
                            toast.success(t('common.copied'));
                          }}
                          title={t('orders.clickToCopy')}
                          style={{ 
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            display: 'block',
                            width: '100%'
                          }}
                        >
                          {phone}
                        </span>
                      );
                    })()}
                  </td>
                  <td>{order.suppliers?.length || 0}</td>
                  <td>{order.totalAmount ? `€${order.totalAmount}` : '-'}</td>
                  <td>{order.createdBy?.username || '-'}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    {new Date(order.updatedAt).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td>{order.observations?.trim() ? t('common.yes') : t('common.no')}</td>
                  <td>
                    <button
                      className="btn-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${order.id}`);
                      }}
                    >
                      {t('orders.viewDetails')}
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
                {t('common.previous')}
              </button>
              <div className="pagination-info">
                {t('common.page')} {pagination.page} {t('common.of')} {pagination.totalPages} ({pagination.total} {t('common.total')})
              </div>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === pagination.totalPages || loading}
              >
                {t('common.next')}
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
        phoneNumber={(() => {
          const phone = selectedOrder?.customerPhone || selectedOrder?.customer?.phone || '';
          const countryCode = selectedOrder?.countryCode || selectedOrder?.customer?.countryCode || '+34';
          return phone ? `${countryCode}${phone}` : '';
        })()}
        initialMessage={whatsappMessage}
      />
    </div>
  );
}

