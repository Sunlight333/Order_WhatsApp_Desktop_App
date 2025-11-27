import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  MessageSquare, 
  Edit2, 
  Clock,
  User,
  Package,
  AlertCircle,
  PhoneCall,
  Loader2,
  Plus,
  CheckCircle
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import WhatsAppModal from '../components/WhatsAppModal';
import '../styles/order-detail.css';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  supplierId: string;
  productRef: string;
  quantity: string;
  price: string;
  supplier: Supplier;
}

interface AuditLog {
  id: string;
  action: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  user: {
    username: string;
  };
}

interface Order {
  id: string;
  customerName?: string;
  customerPhone: string;
  status: string;
  notificationMethod?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
  notifiedAt?: string;
  createdBy: {
    id: string;
    username: string;
  };
  suppliers: Supplier[];
  products: Product[];
  totalAmount: string;
  auditLogs?: AuditLog[];
}

type OrderStatus = 'PENDING' | 'RECEIVED' | 'NOTIFIED_CALL' | 'NOTIFIED_WHATSAPP';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showPhoneCallModal, setShowPhoneCallModal] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrder(id);
    }
  }, [id]);

  const fetchOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await api.get<{
        success: true;
        data: Order;
      }>(`/orders/${orderId}`);
      setOrder(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to load order');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <Package size={16} />;
      case 'NOTIFIED_CALL':
        return <PhoneCall size={16} />;
      case 'NOTIFIED_WHATSAPP':
        return <MessageSquare size={16} />;
      default:
        return <Clock size={16} />;
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
        return 'Merchandise Received';
      case 'NOTIFIED_CALL':
        return 'Customer Notified (Call)';
      case 'NOTIFIED_WHATSAPP':
        return 'Customer Notified (WhatsApp)';
      default:
        return status;
    }
  };

  const handleWhatsAppClick = async () => {
    if (!order) return;

    try {
      // Get WhatsApp message template - prefer user's personal message, fallback to global config
      let message = 'Hola, tu pedido está listo para recoger.';
      
      // First, try to get current user's WhatsApp message
      try {
        const userResponse = await api.get<{
          success: true;
          data: {
            id: string;
            username: string;
            role: string;
            whatsappMessage?: string | null;
          };
        }>('/auth/me');
        
        if (userResponse.data.data?.whatsappMessage) {
          message = userResponse.data.data.whatsappMessage;
        } else {
          // If user doesn't have a personal message, fallback to global config
          try {
            const configResponse = await api.get<{
              success: true;
              data: { value: string };
            }>('/config/whatsapp_default_message');
            
            if (configResponse.data.data?.value) {
              message = configResponse.data.data.value;
            }
          } catch (configError) {
            console.warn('Failed to load global WhatsApp message config, using default');
          }
        }
      } catch (userError) {
        // If /auth/me fails, try global config as fallback
        console.warn('Failed to load user profile, trying global config');
        try {
          const configResponse = await api.get<{
            success: true;
            data: { value: string };
          }>('/config/whatsapp_default_message');
          
          if (configResponse.data.data?.value) {
            message = configResponse.data.data.value;
          }
        } catch (configError) {
          console.warn('Failed to load WhatsApp message config, using default');
        }
      }

      // Store message for modal display
      setWhatsappMessage(message);
      setShowWhatsAppModal(true);
      
    } catch (error: any) {
      toast.error('Failed to load WhatsApp configuration.');
      console.error('WhatsApp error:', error);
    }
  };

  const confirmWhatsAppAction = async (message: string) => {
    if (!order) return;

    try {
      setShowWhatsAppModal(false);

      // Normalize phone number - remove all non-digits
      const phone = order.customerPhone.replace(/\D/g, '');

      // Use WhatsApp API URL format that works with desktop and mobile apps
      // Format: https://api.whatsapp.com/send/?phone={phone}&text={message}&type=phone_number&app_absent=0
      const whatsappUrl = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;

      // Use Electron's shell.openExternal if available, otherwise fallback to window.open
      if (window.electron?.openExternal) {
        try {
          await window.electron.openExternal(whatsappUrl);
        } catch (error: any) {
          console.error('Failed to open WhatsApp via Electron:', error);
          // Fallback to window.open
          window.open(whatsappUrl, '_blank');
        }
      } else {
        // Fallback for web version
        window.open(whatsappUrl, '_blank');
      }

      // Update status to NOTIFIED_WHATSAPP after opening WhatsApp
      setTimeout(async () => {
        try {
          await updateOrderStatus('NOTIFIED_WHATSAPP');
          toast.success('Order status updated to Notified (WhatsApp)');
        } catch (error: any) {
          console.error('Failed to update status:', error);
          toast.error('Failed to update order status');
        }
      }, 500);
      
    } catch (error: any) {
      toast.error('Failed to open WhatsApp. Please check the phone number.');
      console.error('WhatsApp error:', error);
    }
  };

  const handlePhoneCallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!order) return;
    setShowPhoneCallModal(true);
  };

  const confirmPhoneCallAction = async () => {
    if (!order) return;
    setShowPhoneCallModal(false);
    
    try {
      const phoneUrl = `tel:${order.customerPhone}`;
      
      // Use Electron's shell.openExternal if available, otherwise fallback
      if (window.electron?.openExternal) {
        try {
          await window.electron.openExternal(phoneUrl);
        } catch (error: any) {
          console.error('Failed to open phone dialer via Electron:', error);
          window.location.href = phoneUrl;
        }
      } else {
        window.location.href = phoneUrl;
      }
      
      // Update status to NOTIFIED_CALL after a delay
      setTimeout(async () => {
        try {
          await updateOrderStatus('NOTIFIED_CALL');
          toast.success('Order status updated to Notified (Call)');
        } catch (error: any) {
          console.error('Failed to update status:', error);
          toast.error('Failed to update order status');
        }
      }, 1000);
    } catch (error: any) {
      toast.error('Failed to open phone dialer');
      console.error('Phone call error:', error);
    }
  };

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order || !id) return;

    try {
      setUpdating(true);
      const response = await api.patch<{
        success: true;
        data: Order;
      }>(`/orders/${id}/status`, {
        status: newStatus,
        notificationMethod: newStatus.startsWith('NOTIFIED_') 
          ? newStatus.replace('NOTIFIED_', '') 
          : undefined
      });

      setOrder(response.data.data);
      toast.success('Order status updated successfully');
      setShowStatusModal(false);
      
      // Refresh order to get updated audit logs
      fetchOrder(id);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = (status: OrderStatus) => {
    setSelectedStatus(status);
    setShowStatusModal(true);
  };

  const confirmStatusUpdate = () => {
    if (selectedStatus) {
      updateOrderStatus(selectedStatus);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus size={14} />;
      case 'UPDATE':
        return <Edit2 size={14} />;
      case 'STATUS_CHANGE':
        return <CheckCircle size={14} />;
      default:
        return <AlertCircle size={14} />;
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <AlertCircle size={48} />
          <p>Order not found</p>
          <button className="btn-primary" onClick={() => navigate('/orders')}>
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button
          className="btn-icon"
          onClick={() => navigate('/orders')}
          title="Back to orders"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>Order Details</h1>
          <p className="page-subtitle">Order ID: {order.id}</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={() => navigate(`/orders/${id}/edit`)}
          >
            <Edit2 size={18} />
            Edit Order
          </button>
        </div>
      </div>

      <div className="order-detail-grid">
        {/* Order Information */}
        <section className="detail-card">
          <h2>Order Information</h2>
          <div className="detail-content">
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <div className="detail-value">
                <span className={`status-badge ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  {getStatusLabel(order.status)}
                </span>
              </div>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created</span>
              <span className="detail-value">{formatDate(order.createdAt)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created By</span>
              <span className="detail-value">
                <User size={16} />
                {order.createdBy.username}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Last Updated</span>
              <span className="detail-value">{formatDate(order.updatedAt)}</span>
            </div>
            {order.notifiedAt && (
              <div className="detail-row">
                <span className="detail-label">Notified At</span>
                <span className="detail-value">{formatDate(order.notifiedAt)}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Total Amount</span>
              <span className="detail-value total-amount">${order.totalAmount}</span>
            </div>
          </div>
        </section>

        {/* Customer Information */}
        <section className="detail-card">
          <h2>Customer Information</h2>
          <div className="detail-content">
            <div className="detail-row">
              <span className="detail-label">Name</span>
              <span className="detail-value">{order.customerName || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Phone</span>
              <div className="detail-value phone-actions">
                <button
                  onClick={handlePhoneCallClick}
                  className="phone-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  title="Call customer"
                >
                  <Phone size={16} />
                  {order.customerPhone}
                </button>
                <button
                  className="btn-icon btn-whatsapp"
                  onClick={handleWhatsAppClick}
                  title="Send WhatsApp message"
                >
                  <MessageSquare size={18} />
                </button>
              </div>
            </div>
            {order.observations && (
              <div className="detail-row">
                <span className="detail-label">Observations</span>
                <span className="detail-value observations">{order.observations}</span>
              </div>
            )}
          </div>
        </section>

        {/* Status Actions */}
        <section className="detail-card">
          <h2>Update Status</h2>
          <div className="status-actions">
            {order.status === 'PENDING' && (
              <button
                className="status-action-btn yellow"
                onClick={() => handleStatusUpdate('RECEIVED')}
                disabled={updating}
              >
                <Package size={20} />
                Mark as Received
              </button>
            )}
            {(order.status === 'PENDING' || order.status === 'RECEIVED') && (
              <>
                <button
                  className="status-action-btn green"
                  onClick={() => handleStatusUpdate('NOTIFIED_CALL')}
                  disabled={updating}
                >
                  <PhoneCall size={20} />
                  Notified by Call
                </button>
                <button
                  className="status-action-btn green"
                  onClick={handleWhatsAppClick}
                  disabled={updating}
                >
                  <MessageSquare size={20} />
                  Notify via WhatsApp
                </button>
              </>
            )}
          </div>
        </section>

        {/* Products */}
        <section className="detail-card full-width">
          <h2>Products ({order.products.length})</h2>
          <div className="products-table">
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Product Reference</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.products.map((product) => {
                  const quantity = parseFloat(product.quantity) || 0;
                  const price = parseFloat(product.price) || 0;
                  const subtotal = quantity * price;
                  
                  return (
                    <tr key={product.id}>
                      <td>{product.supplier.name}</td>
                      <td>{product.productRef}</td>
                      <td>{product.quantity}</td>
                      <td>${product.price}</td>
                      <td>${subtotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right">Total:</td>
                  <td className="total-amount">${order.totalAmount}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Audit History */}
        {order.auditLogs && order.auditLogs.length > 0 && (
          <section className="detail-card full-width">
            <h2>Order History</h2>
            <div className="audit-timeline">
              {order.auditLogs.map((log) => (
                <div key={log.id} className="audit-entry">
                  <div className="audit-icon">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="audit-content">
                    <div className="audit-header">
                      <span className="audit-action">{log.action}</span>
                      <span className="audit-user">by {log.user.username}</span>
                      <span className="audit-time">{formatDate(log.timestamp)}</span>
                    </div>
                    {log.fieldChanged && (
                      <div className="audit-details">
                        <span className="field-name">{log.fieldChanged}:</span>
                        {log.oldValue && (
                          <span className="old-value">{log.oldValue}</span>
                        )}
                        {log.oldValue && log.newValue && <span>→</span>}
                        {log.newValue && (
                          <span className="new-value">{log.newValue}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Status Update Modal */}
      <ConfirmModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onConfirm={confirmStatusUpdate}
        title="Confirm Status Update"
        message={
          <div>
            <p>Are you sure you want to update the order status to:</p>
            <div className="status-preview">
              <span className={`status-badge ${getStatusColor(selectedStatus!)}`}>
                {getStatusIcon(selectedStatus!)}
                {getStatusLabel(selectedStatus!)}
              </span>
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              This action will update the order status and be recorded in the audit log.
            </p>
          </div>
        }
        confirmText="Confirm Update"
        cancelText="Cancel"
        type="info"
        loading={updating}
      />

      {/* WhatsApp Confirmation Modal */}
      {order && (
        <WhatsAppModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          onConfirm={confirmWhatsAppAction}
          phoneNumber={order.customerPhone}
          initialMessage={whatsappMessage}
        />
      )}

      {/* Phone Call Confirmation Modal */}
      <ConfirmModal
        isOpen={showPhoneCallModal}
        onClose={() => setShowPhoneCallModal(false)}
        onConfirm={confirmPhoneCallAction}
        title="Call Customer"
        message={
          <div>
            <p>Do you want to call <strong>{order?.customerPhone}</strong>?</p>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              This will open your phone dialer. After calling, the order status will automatically update to <strong>"Notified (Call)"</strong>.
            </p>
          </div>
        }
        confirmText="Call Customer"
        cancelText="Cancel"
        type="info"
      />
    </div>
  );
}
