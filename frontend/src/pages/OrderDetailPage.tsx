import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { useOrderStatusConfig, getStatusConfig } from '../hooks/useOrderStatusConfig';
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
  receivedQuantity?: string | null;
  supplier: Supplier;
}

interface AuditLog {
  id: string;
  action: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  metadata?: string | Record<string, any>;
  user: {
    username: string;
  };
}

interface Order {
  id: string;
  orderNumber?: number; // Auto-incremental order number (1, 2, 3...)
  customerName?: string;
  customerId?: string;
  customerPhone?: string;
  countryCode?: string;
  status: string;
  notificationMethod?: string;
  observations?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  notifiedAt?: string;
  createdBy: {
    id: string;
    username: string;
  };
  customer?: {
    id: string;
    name: string;
    phone?: string;
    countryCode?: string;
  } | null;
  suppliers: Supplier[];
  products: Product[];
  totalAmount: string;
  auditLogs?: AuditLog[];
}

type OrderStatus = 'PENDING' | 'RECEIVED' | 'NOTIFIED_CALL' | 'NOTIFIED_WHATSAPP' | 'CANCELLED' | 'INCOMPLETO' | 'DELIVERED_COUNTER';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showPhoneCallModal, setShowPhoneCallModal] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [updatingProducts, setUpdatingProducts] = useState<Set<string>>(new Set());

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
      toast.error(error.response?.data?.error?.message || t('orderDetail.loadOrderFailed'));
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

  const { config: statusConfig } = useOrderStatusConfig();

  const getStatusColor = (status: string) => {
    // Use custom config if available, otherwise fallback to default
    const config = getStatusConfig(status, statusConfig);
    return 'status-custom';
  };

  const getStatusLabel = (status: string) => {
    const config = getStatusConfig(status, statusConfig);
    return config.text || status;
  };

  const getStatusStyle = (status: string) => {
    const config = getStatusConfig(status, statusConfig);
    return {
      color: config.color || '#6b7280',
      backgroundColor: config.backgroundColor || '#f3f4f6',
      fontFamily: config.fontFamily || 'inherit',
      fontSize: config.fontSize || 'inherit',
      fontWeight: config.fontWeight || 'normal',
    };
  };

  const handleWhatsAppClick = async () => {
    if (!order) return;

    try {
      // Get WhatsApp message template - prefer user's personal message, fallback to global config
      // Use translated default message based on current language
      let message = t('whatsapp.defaultMessage');
      
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
      toast.error(t('orderDetail.whatsappConfigFailed'));
      console.error('WhatsApp error:', error);
    }
  };

  const confirmWhatsAppAction = async (message: string) => {
    if (!order) return;

    try {
      setShowWhatsAppModal(false);

      // Get phone number and country code
      const phoneNumber = order.customerPhone || order.customer?.phone || '';
      if (!phoneNumber) {
        toast.error(t('orders.noPhoneNumber'));
        return;
      }
      
      // Get country code (default to +34 if not provided)
      const countryCode = order.countryCode || order.customer?.countryCode || '+34';
      
      // Check if phone number already includes country code (starts with +)
      let fullPhone: string;
      if (phoneNumber.startsWith('+')) {
        // Phone already includes country code, use it directly
        fullPhone = phoneNumber.replace(/\D/g, '');
      } else {
        // Combine country code and phone number
        // Remove + and any non-digits from country code
        const cleanCountryCode = countryCode.replace(/^\+/, '').replace(/\D/g, '');
        // Remove all non-digits from phone number
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        fullPhone = cleanCountryCode + cleanPhone;
      }

      // Use WhatsApp API URL format that works with desktop and mobile apps
      // Format: https://api.whatsapp.com/send/?phone={phone}&text={message}&type=phone_number&app_absent=0
      const whatsappUrl = `https://api.whatsapp.com/send/?phone=${fullPhone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;

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
          toast.success(t('orderDetail.statusUpdatedWhatsApp'));
        } catch (error: any) {
          console.error('Failed to update status:', error);
          toast.error(t('orderDetail.updateStatusFailed'));
        }
      }, 500);
      
    } catch (error: any) {
      toast.error(t('orderDetail.whatsappFailed'));
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
      const phoneNumber = order.customerPhone || order.customer?.phone;
      if (!phoneNumber) {
        toast.error(t('orders.noPhoneNumber'));
        return;
      }
      
      // Get country code (default to +34 if not provided)
      const countryCode = order.countryCode || order.customer?.countryCode || '+34';
      
      // Build full phone number for tel: URL
      // If phone already starts with +, use it directly; otherwise combine with country code
      const fullPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `${countryCode}${phoneNumber}`;
      
      const phoneUrl = `tel:${fullPhone}`;
      
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
          toast.success(t('orderDetail.statusUpdatedCall'));
        } catch (error: any) {
          console.error('Failed to update status:', error);
          toast.error(t('orderDetail.updateStatusFailed'));
        }
      }, 1000);
    } catch (error: any) {
      toast.error(t('orderDetail.phoneCallFailed'));
      console.error('Phone call error:', error);
    }
  };

  const updateOrderStatus = async (newStatus: OrderStatus, reason?: string) => {
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
          : undefined,
        cancellationReason: newStatus === 'CANCELLED' ? reason : undefined
      });

      setOrder(response.data.data);
      toast.success(t('orderDetail.statusUpdated'));
      setShowStatusModal(false);
      
      // Refresh order to get updated audit logs
      fetchOrder(id);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('orderDetail.updateStatusGenericFailed'));
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = (status: OrderStatus) => {
    setSelectedStatus(status);
    setCancellationReason(''); // Reset cancellation reason
    setShowStatusModal(true);
  };

  const handleUpdateReceivedQuantity = async (productId: string, receivedQuantity: string | null) => {
    if (!order || !id) return;

    // Find the product to get the ordered quantity
    const product = order.products.find((p) => p.id === productId);
    if (!product) return;

    // Client-side validation: Check if received quantity exceeds ordered quantity
    if (receivedQuantity !== null && receivedQuantity !== '') {
      const received = parseFloat(receivedQuantity);
      const ordered = parseFloat(product.quantity) || 0;

      if (isNaN(received)) {
        toast.error(t('orderDetail.invalidQuantity') || 'Invalid quantity entered');
        return;
      }

      if (received < 0) {
        toast.error(t('orderDetail.negativeQuantity') || 'Received quantity cannot be negative');
        return;
      }

      if (received > ordered) {
        toast.error(
          t('orderDetail.quantityExceeded') || 
          `Received quantity (${received}) cannot exceed ordered quantity (${ordered})`
        );
        return;
      }
    }

    setUpdatingProducts((prev) => new Set(prev).add(productId));

    try {
      await api.patch(`/orders/${id}/products/${productId}/received`, {
        receivedQuantity: receivedQuantity || null,
      });

      // Refresh order data
      if (id) {
        await fetchOrder(id);
      }
      toast.success(t('orderDetail.receivedQuantityUpdated'));
    } catch (error: any) {
      console.error('Failed to update received quantity:', error);
      const errorMessage = error.response?.data?.error?.message || t('orderDetail.updateFailed');
      toast.error(errorMessage);
    } finally {
      setUpdatingProducts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const confirmStatusUpdate = () => {
    if (selectedStatus) {
      // Validate cancellation reason is required when cancelling
      if (selectedStatus === 'CANCELLED' && !cancellationReason.trim()) {
        toast.error(t('orderDetail.cancellationReasonRequired'));
        return;
      }
      updateOrderStatus(selectedStatus, cancellationReason.trim() || undefined);
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

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE':
        return t('orderDetail.actionCreate');
      case 'UPDATE':
        return t('orderDetail.actionUpdate');
      case 'STATUS_CHANGE':
        return t('orderDetail.actionStatusChange');
      default:
        return action;
    }
  };

  const getFieldLabel = (fieldName: string) => {
    // Translate common field names
    const fieldTranslations: Record<string, string> = {
      'status': t('common.status'),
      'customerName': t('orders.customerName'),
      'customerPhone': t('orders.customerPhone'),
      'observations': t('orders.observations'),
      'totalAmount': t('orderDetail.totalAmount'),
      'receivedQuantity': t('orderDetail.receivedQuantity'),
      'price': t('orderDetail.price'),
    };
    return fieldTranslations[fieldName] || fieldName;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>{t('orderDetail.loadingOrder')}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <AlertCircle size={48} />
          <p>{t('orderDetail.orderNotFound')}</p>
          <button className="btn-primary" onClick={() => navigate('/orders')}>
            {t('orderDetail.backToOrders')}
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
          title={t('orderDetail.backToOrders')}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>{t('orderDetail.title')}</h1>
          <p className="page-subtitle">{t('orderDetail.orderNumber')}: {order.orderNumber || '-'}</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={() => navigate(`/orders/${id}/edit`)}
          >
            <Edit2 size={18} />
            {t('orderDetail.editOrder')}
          </button>
        </div>
      </div>

      <div className="order-detail-grid">
        {/* {t('orderDetail.orderInfo')} */}
        <section className="detail-card">
          <h2>{t('orderDetail.orderInfo')}</h2>
          <div className="detail-content">
            <div className="detail-row">
              <span className="detail-label">{t('common.status')}</span>
              <div className="detail-value">
                <span 
                  className="status-badge status-custom"
                  style={getStatusStyle(order.status)}
                >
                  {getStatusIcon(order.status)}
                  {getStatusLabel(order.status)}
                </span>
              </div>
            </div>
            <div className="detail-row">
              <span className="detail-label">{t('orders.createdAt')}</span>
              <span className="detail-value">{formatDate(order.createdAt)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{t('orderDetail.createdBy')}</span>
              <span className="detail-value">
                <User size={16} />
                {order.createdBy.username}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{t('orders.updatedAt')}</span>
              <span className="detail-value">{formatDate(order.updatedAt)}</span>
            </div>
            {order.notifiedAt && (
              <div className="detail-row">
                <span className="detail-label">{t('orders.notifiedAt')}</span>
                <span className="detail-value">{formatDate(order.notifiedAt)}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">{t('orderDetail.totalAmount')}</span>
              <span className="detail-value total-amount">€{order.totalAmount}</span>
            </div>
          </div>
        </section>

        {/* {t('orderDetail.customerInfo')} */}
        <section className="detail-card">
          <h2>{t('orderDetail.customerInfo')}</h2>
          <div className="detail-content">
            <div className="detail-row">
              <span className="detail-label">{t('orders.customerName')}</span>
              <span className="detail-value">{order.customerName || order.customer?.name || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{t('orders.customerPhone')}</span>
              <div className="detail-value phone-actions">
                {(() => {
                  const phone = order.customerPhone || order.customer?.phone;
                  if (!phone) {
                    return <span>-</span>;
                  }
                  const countryCode = order.countryCode || order.customer?.countryCode || '+34';
                  const fullPhone = `${countryCode} ${phone}`;
                  return (
                    <button
                      onClick={handlePhoneCallClick}
                      className="phone-link"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      title={t('orderDetail.callCustomer')}
                    >
                      <Phone size={16} />
                      {fullPhone}
                    </button>
                  );
                })()}
                <button
                  className="btn-icon btn-whatsapp"
                  onClick={handleWhatsAppClick}
                  title={t('orderDetail.sendWhatsApp')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .96 4.534.96 10.09c0 1.79.463 3.47 1.27 4.94L0 24l9.218-2.38a11.807 11.807 0 005.832 1.53h.005c5.554 0 10.09-4.535 10.09-10.09 0-2.76-1.12-5.26-2.933-7.075"/>
                  </svg>
                </button>
              </div>
            </div>
            {order.observations && (
              <div className="detail-row">
                <span className="detail-label">{t('orders.observations')}</span>
                <span className="detail-value observations">{order.observations}</span>
              </div>
            )}
            {order.cancellationReason && (
              <div className="detail-row">
                <span className="detail-label">{t('orderDetail.cancellationReason')}</span>
                <span className="detail-value" style={{ color: 'var(--error-color)', fontStyle: 'italic' }}>
                  {order.cancellationReason}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Status Actions */}
        <section className="detail-card">
          <h2>{t('orderDetail.updateStatus')}</h2>
          <div className="status-actions">
            {/* Show all status options, allowing users to change to any status */}
            <button
              className={`status-action-btn ${order.status === 'PENDING' ? 'active' : ''}`}
              onClick={() => handleStatusUpdate('PENDING')}
              disabled={updating || order.status === 'PENDING'}
              title={order.status === 'PENDING' ? t('orderDetail.currentStatus') : t('orderDetail.setToPending')}
            >
              <Clock size={20} />
              {t('orders.statusPending')}
            </button>
            
            <button
              className={`status-action-btn green ${order.status === 'RECEIVED' ? 'active' : ''}`}
              onClick={() => handleStatusUpdate('RECEIVED')}
              disabled={updating || order.status === 'RECEIVED'}
              title={order.status === 'RECEIVED' ? t('orderDetail.currentStatus') : t('orderDetail.markAsReceived')}
            >
              <Package size={20} />
              {t('orderDetail.markAsReceived')}
            </button>
            
            <button
              className={`status-action-btn green ${order.status === 'DELIVERED_COUNTER' ? 'active' : ''}`}
              onClick={() => handleStatusUpdate('DELIVERED_COUNTER')}
              disabled={updating || order.status === 'DELIVERED_COUNTER'}
              title={order.status === 'DELIVERED_COUNTER' ? t('orderDetail.currentStatus') : t('orderDetail.markAsDeliveredCounter')}
            >
              <Package size={20} />
              {t('orderDetail.markAsDeliveredCounter')}
            </button>
            
            <button
              className={`status-action-btn green ${order.status === 'NOTIFIED_CALL' ? 'active' : ''}`}
              onClick={() => handleStatusUpdate('NOTIFIED_CALL')}
              disabled={updating || order.status === 'NOTIFIED_CALL'}
              title={order.status === 'NOTIFIED_CALL' ? t('orderDetail.currentStatus') : t('orderDetail.notifiedByCall')}
            >
              <PhoneCall size={20} />
              {t('orderDetail.notifiedByCall')}
            </button>
            
            <button
              className={`status-action-btn green ${order.status === 'NOTIFIED_WHATSAPP' ? 'active' : ''}`}
              onClick={handleWhatsAppClick}
              disabled={updating || order.status === 'NOTIFIED_WHATSAPP'}
              title={order.status === 'NOTIFIED_WHATSAPP' ? t('orderDetail.currentStatus') : t('orderDetail.sendWhatsApp')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '0.5rem' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .96 4.534.96 10.09c0 1.79.463 3.47 1.27 4.94L0 24l9.218-2.38a11.807 11.807 0 005.832 1.53h.005c5.554 0 10.09-4.535 10.09-10.09 0-2.76-1.12-5.26-2.933-7.075"/>
              </svg>
              {t('orderDetail.sendWhatsApp')}
            </button>
            
            <button
              className={`status-action-btn red ${order.status === 'CANCELLED' ? 'active' : ''}`}
              disabled={updating || order.status === 'CANCELLED'}
              title={order.status === 'CANCELLED' ? t('orderDetail.currentStatus') : t('orderDetail.cancelOrder')}
              onClick={() => handleStatusUpdate('CANCELLED')}
            >
              {t('orderDetail.cancelOrder')}
            </button>
          </div>
        </section>

        {/* Products */}
        <section className="detail-card full-width">
          <h2>{t('orderDetail.products')} ({order.products.length})</h2>
          <div className="products-table">
            <table>
              <thead>
                <tr>
                  <th>{t('orderDetail.supplier')}</th>
                  <th>{t('orderDetail.productRef')}</th>
                  <th>{t('orderDetail.quantity')}</th>
                  <th>{t('orderDetail.receivedQuantity')}</th>
                  <th>{t('orderDetail.price')}</th>
                  <th>{t('orderDetail.subtotal')}</th>
                </tr>
              </thead>
              <tbody>
                {order.products.map((product) => {
                  const quantity = parseFloat(product.quantity) || 0;
                  const received = product.receivedQuantity ? parseFloat(product.receivedQuantity) : 0;
                  const price = parseFloat(product.price) || 0;
                  const subtotal = quantity * price;
                  const isReceived = received > 0;
                  const isFullyReceived = received >= quantity;
                  const isUpdating = updatingProducts.has(product.id);
                  
                  return (
                    <tr 
                      key={product.id}
                      className={isReceived ? (isFullyReceived ? 'product-received' : 'product-partial') : ''}
                    >
                      <td>{product.supplier.name}</td>
                      <td>{product.productRef}</td>
                      <td>{product.quantity}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="number"
                            min="0"
                            max={quantity}
                            step="0.01"
                            value={received || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Update immediately for better UX
                              handleUpdateReceivedQuantity(product.id, value || null);
                            }}
                            onBlur={(e) => {
                              // Validate on blur as well
                              const value = e.target.value;
                              if (value && parseFloat(value) > quantity) {
                                toast.error(
                                  t('orderDetail.quantityExceeded') || 
                                  `Received quantity cannot exceed ordered quantity (${quantity})`
                                );
                              }
                            }}
                            placeholder="0"
                            disabled={isUpdating}
                            style={{
                              width: '80px',
                              padding: '0.25rem 0.5rem',
                              border: isReceived ? '2px solid var(--success)' : '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundColor: isReceived ? 'var(--success-light)' : 'var(--input-bg)',
                            }}
                          />
                          {isReceived && (
                            <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                          )}
                        </div>
                      </td>
                      <td>€{product.price}</td>
                      <td>€{subtotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-right">{t('orderDetail.total')}:</td>
                  <td className="total-amount">€{order.totalAmount}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Audit History */}
        {order.auditLogs && order.auditLogs.length > 0 && (
          <section className="detail-card full-width">
            <h2>{t('orderDetail.orderHistory')}</h2>
            <div className="audit-timeline">
              {order.auditLogs.map((log) => (
                <div key={log.id} className="audit-entry">
                  <div className="audit-icon">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="audit-content">
                    <div className="audit-header">
                      <span className="audit-action">{getActionLabel(log.action)}</span>
                      <span className="audit-user">{t('orderDetail.by')} {log.user.username}</span>
                      <span className="audit-time">{formatDate(log.timestamp)}</span>
                    </div>
                    {log.fieldChanged && (
                      <div className="audit-details">
                        {log.fieldChanged === 'price' && log.metadata && (
                          <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {(() => {
                              try {
                                const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
                                return meta.productRef && meta.supplierName 
                                  ? `${meta.productRef} (${meta.supplierName})`
                                  : meta.productRef || '';
                              } catch {
                                return '';
                              }
                            })()}
                          </div>
                        )}
                        <div>
                          <span className="field-name">{getFieldLabel(log.fieldChanged)}:</span>
                          {log.oldValue && (
                            <span className="old-value">
                              {log.fieldChanged === 'price' ? '€' : ''}{log.oldValue}
                            </span>
                          )}
                          {log.oldValue && log.newValue && <span> → </span>}
                          {log.newValue && (
                            <span className="new-value">
                              {log.fieldChanged === 'price' ? '€' : ''}{log.newValue}
                            </span>
                          )}
                        </div>
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
        title={t('orderDetail.confirmStatusUpdate')}
        message={
          <div>
            <p>{t('orderDetail.confirmStatusUpdateMessage')}</p>
            <div className="status-preview">
              <span 
                className="status-badge status-custom"
                style={getStatusStyle(selectedStatus!)}
              >
                {getStatusIcon(selectedStatus!)}
                {getStatusLabel(selectedStatus!)}
              </span>
            </div>
            {selectedStatus === 'CANCELLED' && (
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {t('orderDetail.cancellationReason')} <span style={{ color: 'var(--error-color)' }}>*</span>
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder={t('orderDetail.enterCancellationReason')}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9375rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>
            )}
            {selectedStatus !== 'CANCELLED' && (
              <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {t('orderDetail.statusUpdateDescription')}
              </p>
            )}
          </div>
        }
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        type="info"
        loading={updating}
      />

      {/* WhatsApp Confirmation Modal */}
      {order && (
        <WhatsAppModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          onConfirm={confirmWhatsAppAction}
          phoneNumber={(() => {
            const phone = order.customerPhone || order.customer?.phone || '';
            const countryCode = order.countryCode || order.customer?.countryCode || '+34';
            return phone ? `${countryCode}${phone}` : '';
          })()}
          initialMessage={whatsappMessage}
        />
      )}

      {/* Phone Call Confirmation Modal */}
      <ConfirmModal
        isOpen={showPhoneCallModal}
        onClose={() => setShowPhoneCallModal(false)}
        onConfirm={confirmPhoneCallAction}
        title={t('orderDetail.confirmCall')}
        message={
          <div>
            <p>
              {(() => {
                const phone = order?.customerPhone || order?.customer?.phone;
                const countryCode = order?.countryCode || order?.customer?.countryCode || '+34';
                const fullPhone = phone ? `${countryCode} ${phone}` : '-';
                return t('orderDetail.callConfirm', { phone: fullPhone });
              })()}
            </p>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {t('orderDetail.callDescription')}
            </p>
          </div>
        }
        confirmText={t('orderDetail.callCustomer')}
        cancelText={t('common.cancel')}
        type="info"
      />
    </div>
  );
}
