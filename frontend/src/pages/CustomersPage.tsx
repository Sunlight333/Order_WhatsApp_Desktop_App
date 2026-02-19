import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, UserCircle, Loader2, Search, X, Copy, Phone, ArrowUp, ArrowDown, ChevronUp, History, CheckCircle, AlertCircle, Download } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import { exportToExcel } from '../utils/excelExport';
import { useAuthStore } from '../store/authStore';
import '../styles/customers.css';
import '../styles/order-detail.css';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  countryCode?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  ordersCount: number;
  createdBy?: {
    id: string;
    username: string;
  } | null;
  updatedBy?: {
    id: string;
    username: string;
  } | null;
}

interface CustomerFormData {
  name: string;
  phone: string;
  countryCode: string;
  description: string;
}

interface CustomerAuditLog {
  id: string;
  customerId: string;
  userId: string;
  user: {
    id: string;
    username: string;
  };
  action: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  metadata?: Record<string, any> | null;
}

export default function CustomersPage() {
  const { t, i18n } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<CustomerAuditLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    countryCode: '+34', // Fixed for Spain
    description: '',
  });
  
  // Country code is fixed to +34 for Spain
  const countryCode = '+34';
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  useEffect(() => {
    checkUserRole();
    fetchCustomers();
  }, [sortBy, sortOrder]);

  const checkUserRole = async () => {
    try {
      const response = await api.get<{ success: true; data: any }>('/auth/me');
      setCurrentUser(response.data.data);
    } catch (error) {
      console.error('Failed to check user role:', error);
    }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const { user } = useAuthStore();

  const handleExportCustomers = () => {
    if (!isSuperAdmin) {
      toast.error(t('common.unauthorized'));
      return;
    }

    try {
      if (customers.length === 0) {
        toast.error(t('customers.noCustomersToExport'));
        return;
      }

      const formatDateForExport = (dateString: string) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      };
      
      const exportData = customers.map((customer) => ({
        [t('customers.name')]: customer.name,
        [t('common.phone')]: customer.phone ? `${customer.countryCode || '+34'} ${customer.phone}` : '-',
        [t('customers.description')]: customer.description || '-',
        [t('customers.ordersCount')]: customer.ordersCount || 0,
        [t('customers.createdBy')]: customer.createdBy?.username || '-',
        [t('customers.updatedBy')]: customer.updatedBy?.username || '-',
        [t('customers.createdAt')]: formatDateForExport(customer.createdAt),
        [t('customers.updatedAt')]: formatDateForExport(customer.updatedAt),
      }));

      const timestamp = new Date().toISOString().split('T')[0];
      exportToExcel(exportData, `clientes_${timestamp}`, t('customers.customersList'));
      toast.success(t('customers.customersExported'));
    } catch (error: any) {
      console.error('Failed to export customers:', error);
      toast.error(t('customers.exportFailed'));
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (sortBy) {
        params.sortBy = sortBy;
      }
      if (sortOrder) {
        params.sortOrder = sortOrder;
      }
      const response = await api.get<{ success: true; data: Customer[] }>('/customers', { params });
      setCustomers(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('customers.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to asc
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ChevronUp size={14} style={{ opacity: 0.3 }} />;
    }
    return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      phone: '',
      countryCode: '+34', // Fixed for Spain
      description: '',
    });
    setShowCreateModal(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      countryCode: '+34', // Fixed for Spain
      description: customer.description || '',
    });
    setShowEditModal(true);
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteModal(true);
  };

  const handleCreateSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t('customers.nameRequired'));
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/customers', {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        countryCode: formData.countryCode || '+34',
        description: formData.description.trim() || undefined,
      });
      toast.success(t('customers.createSuccess'));
      setShowCreateModal(false);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('customers.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = () => {
    if (!formData.name.trim()) {
      toast.error(t('customers.nameRequired'));
      return;
    }

    // Show confirmation modal instead of directly updating
    setShowUpdateConfirmModal(true);
  };

  const confirmCustomerUpdate = async () => {
    setShowUpdateConfirmModal(false);

    try {
      setSubmitting(true);
      await api.put(`/customers/${selectedCustomer?.id}`, {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        countryCode: formData.countryCode || '+34',
        description: formData.description.trim() || null,
      });
      toast.success(t('customers.updateSuccess'));
      setShowEditModal(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('customers.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCustomer) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/customers/${selectedCustomer.id}`);
      toast.success(t('customers.deleteSuccess'));
      setShowDeleteModal(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('customers.deleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.description?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatPhone = (customer: Customer) => {
    if (!customer.phone) return '-';
    const code = customer.countryCode || '+34';
    return `${code} ${customer.phone}`;
  };

  const handleRowRightClick = (e: React.MouseEvent, customer: Customer) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedCustomer(customer);
    showContextMenu(e, customer);
  };

  const handleCopyName = () => {
    if (!selectedCustomer) return;
    navigator.clipboard.writeText(selectedCustomer.name);
    toast.success(t('common.copied'));
  };

  const handleCopyPhone = () => {
    if (!selectedCustomer || !selectedCustomer.phone) return;
    navigator.clipboard.writeText(formatPhone(selectedCustomer));
    toast.success(t('common.copied'));
  };

  const handleCopyDescription = () => {
    if (!selectedCustomer || !selectedCustomer.description) return;
    navigator.clipboard.writeText(selectedCustomer.description);
    toast.success(t('common.copied'));
  };

  const handleViewHistory = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    
    try {
      const response = await api.get<{ success: true; data: CustomerAuditLog[] }>(`/customers/${customer.id}/audit-logs`);
      setAuditLogs(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('customers.historyLoadFailed'));
      setShowHistoryModal(false);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus size={14} />;
      case 'UPDATE':
        return <Edit2 size={14} />;
      case 'DELETE':
        return <Trash2 size={14} />;
      default:
        return <AlertCircle size={14} />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE':
        return t('customers.actionCreate');
      case 'UPDATE':
        return t('customers.actionUpdate');
      case 'DELETE':
        return t('customers.actionDelete');
      default:
        return action;
    }
  };

  const getFieldLabel = (fieldName: string) => {
    const fieldTranslations: Record<string, string> = {
      'name': t('common.name'),
      'phone': t('common.phone'),
      'countryCode': t('common.countryCode'),
      'description': t('common.description'),
    };
    return fieldTranslations[fieldName] || fieldName;
  };

  const getContextMenuItems = (customer: Customer): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    // Edit is available to all users
    items.push({
      label: t('customers.editCustomer'),
      icon: <Edit2 size={16} />,
      action: () => {
        setSelectedCustomer(customer);
        setFormData({
          name: customer.name,
          phone: customer.phone || '',
          countryCode: customer.countryCode || '+34',
          description: customer.description || '',
        });
        setShowEditModal(true);
      },
    });

    items.push(
      {
        label: t('customers.copyName'),
        icon: <Copy size={16} />,
        action: handleCopyName,
      },
      {
        label: t('customers.copyPhone'),
        icon: <Phone size={16} />,
        action: handleCopyPhone,
        disabled: !customer.phone,
      },
      {
        label: t('customers.copyDescription'),
        icon: <Copy size={16} />,
        action: handleCopyDescription,
        disabled: !customer.description,
      }
    );

    // History and Delete are only available to SUPER_ADMIN
    if (isSuperAdmin) {
      items.push({ divider: true });
      items.push({
        label: t('customers.viewHistory'),
        icon: <History size={16} />,
        action: () => handleViewHistory(customer),
      });
      items.push({
        label: t('customers.deleteCustomer'),
        icon: <Trash2 size={16} />,
        action: () => {
          setSelectedCustomer(customer);
          setShowDeleteModal(true);
        },
        danger: true,
      });
    }

    return items;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>{t('customers.loadingCustomers')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{t('customers.title')}</h1>
          <p className="page-subtitle">{t('customers.manageCustomers')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isSuperAdmin && (
            <button
              className="btn-secondary"
              onClick={handleExportCustomers}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={18} />
              {t('customers.exportToExcel')}
            </button>
          )}
          <button className="btn-primary" onClick={handleCreate}>
            <Plus size={20} />
            {t('customers.createCustomer')}
          </button>
        </div>
      </div>

      <div className="customers-toolbar">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder={t('customers.searchPlaceholder')}
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
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <UserCircle size={48} />
          <p>{t('customers.noCustomers')}</p>
          <button className="btn-primary" onClick={handleCreate}>
            <Plus size={20} />
            {t('customers.createFirstCustomer')}
          </button>
        </div>
      ) : (
        <div className="customers-list-container">
          <table className="customers-table">
            <thead>
              <tr>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('name')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t('common.name')}
                    {getSortIcon('name')}
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
                <th>{t('common.description')}</th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('ordersCount')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t('customers.orders')}
                    {getSortIcon('ordersCount')}
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
                {isSuperAdmin && <th>{t('customers.createdBy')}</th>}
                {isSuperAdmin && <th>{t('customers.updatedBy')}</th>}
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr 
                  key={customer.id} 
                  className="customer-row"
                  onContextMenu={(e) => handleRowRightClick(e, customer)}
                >
                  <td>
                    <div className="customer-name">{customer.name}</div>
                  </td>
                  <td>
                    <div className="customer-phone">
                      {formatPhone(customer)}
                    </div>
                  </td>
                  <td>
                    <div className="customer-description">
                      {customer.description || '-'}
                    </div>
                  </td>
                  <td>
                    <span className="count-badge">{customer.ordersCount}</span>
                  </td>
                  <td>{formatDate(customer.createdAt)}</td>
                  {isSuperAdmin && (
                    <td>
                      <div className="customer-user-info">
                        {customer.createdBy ? customer.createdBy.username : '-'}
                      </div>
                    </td>
                  )}
                  {isSuperAdmin && (
                    <td>
                      <div className="customer-user-info">
                        {customer.updatedBy ? customer.updatedBy.username : '-'}
                      </div>
                    </td>
                  )}
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon btn-edit"
                        onClick={() => handleEdit(customer)}
                        title={t('customers.editCustomer')}
                      >
                        <Edit2 size={16} />
                      </button>
                      {isSuperAdmin && (
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(customer)}
                          title={t('customers.deleteCustomer')}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Customer Modal */}
      <ConfirmModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onConfirm={handleCreateSubmit}
            title={t('customers.createCustomer')}
            message={
              <div className="customer-form">
                <div className="form-group">
                  <label>
                    {t('common.name')} <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('customers.enterCustomerName')}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('common.phone')}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.9375rem',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap'
                    }}>
                      +34
                    </span>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder={t('createOrder.enterCustomerPhone')}
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('common.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('customers.enterDescription')}
                    className="form-input form-textarea"
                    rows={3}
                  />
                </div>
              </div>
            }
            confirmText={t('customers.createCustomer')}
            cancelText={t('common.cancel')}
            type="info"
            loading={submitting}
          />

          {/* Edit Customer Modal */}
          <ConfirmModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedCustomer(null);
            }}
            onConfirm={handleEditSubmit}
            title={t('customers.editCustomer')}
            message={
              <div className="customer-form">
                <div className="form-group">
                  <label>
                    {t('common.name')} <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('customers.enterCustomerName')}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('common.phone')}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.9375rem',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap'
                    }}>
                      +34
                    </span>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder={t('createOrder.enterCustomerPhone')}
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('common.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('customers.enterDescription')}
                    className="form-input form-textarea"
                    rows={3}
                  />
                </div>
              </div>
            }
            confirmText={t('customers.saveChanges')}
            cancelText={t('common.cancel')}
            type="info"
            loading={submitting}
          />

          {/* Delete Customer Modal - Only visible to SUPER_ADMIN */}
          {isSuperAdmin && (
            <ConfirmModal
              isOpen={showDeleteModal}
              onClose={() => {
                setShowDeleteModal(false);
                setSelectedCustomer(null);
              }}
              onConfirm={handleDeleteConfirm}
              title={t('customers.deleteCustomer')}
              message={
                <div>
                  <p>
                    {t('customers.deleteConfirm', { name: selectedCustomer?.name })}
                  </p>
                  {selectedCustomer && selectedCustomer.ordersCount > 0 && (
                    <p className="warning-text">
                      {t('customers.hasOrdersWarning', { count: selectedCustomer.ordersCount })}
                    </p>
                  )}
                  <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {t('customers.deleteWarning')}
                  </p>
                </div>
              }
              confirmText={t('customers.deleteCustomer')}
              cancelText={t('common.cancel')}
              type="danger"
              loading={deleteLoading}
            />
          )}

          {/* Update Confirmation Modal */}
          <ConfirmModal
            isOpen={showUpdateConfirmModal}
            onClose={() => setShowUpdateConfirmModal(false)}
            onConfirm={confirmCustomerUpdate}
            title={t('customers.confirmUpdate')}
            message={
              <div>
                <p>{t('customers.confirmUpdateMessage', { name: selectedCustomer?.name })}</p>
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {t('customers.updateWarning')}
                </p>
              </div>
            }
            confirmText={t('customers.updateCustomer')}
            cancelText={t('common.cancel')}
            type="info"
            loading={submitting}
          />

      {/* Customer History Modal - Only for SUPER_ADMIN */}
      {isSuperAdmin && (
        <ConfirmModal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setAuditLogs([]);
          }}
          onConfirm={() => {
            setShowHistoryModal(false);
            setAuditLogs([]);
          }}
          title={t('customers.customerHistory', { name: selectedCustomer?.name })}
          message={
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingHistory ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                  <Loader2 className="spinner" size={24} />
                  <span style={{ marginLeft: '1rem' }}>{t('customers.loadingHistory')}</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  {t('customers.noHistory')}
                </div>
              ) : (
                <div className="audit-timeline">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="audit-entry">
                      <div className="audit-icon">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="audit-content">
                        <div className="audit-header">
                          <span className="audit-action">{getActionLabel(log.action)}</span>
                          <span className="audit-user">{t('customers.by')} {log.user.username}</span>
                          <span className="audit-time">{formatDate(log.timestamp)}</span>
                        </div>
                        {log.fieldChanged && (
                          <div className="audit-details">
                            <div>
                              <span className="field-name">{getFieldLabel(log.fieldChanged)}:</span>
                              {log.oldValue && (
                                <span className="old-value">
                                  {log.oldValue}
                                </span>
                              )}
                              {log.oldValue && log.newValue && <span> → </span>}
                              {log.newValue && (
                                <span className="new-value">
                                  {log.newValue}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {log.action === 'CREATE' && log.metadata && (
                          <div className="audit-details" style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {t('customers.createdWith', {
                              name: log.metadata.name || '',
                              phone: log.metadata.phone || '-',
                            })}
                          </div>
                        )}
                        {log.action === 'DELETE' && log.metadata && (
                          <div className="audit-details" style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {t('customers.deletedWith', {
                              name: log.metadata.name || '',
                              phone: log.metadata.phone || '-',
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          }
          confirmText={t('common.close')}
          cancelText=""
          type="info"
          hideCancel={true}
        />
      )}

      {/* Context Menu */}
      <ContextMenu
        items={selectedCustomer ? getContextMenuItems(selectedCustomer) : []}
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        onClose={hideContextMenu}
      />
    </div>
  );
}

