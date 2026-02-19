import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Package, Loader2, Search, X, Copy, ArrowUp, ArrowDown, ChevronUp, Download } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import { exportToExcel } from '../utils/excelExport';
import { useAuthStore } from '../store/authStore';
import '../styles/suppliers.css';

interface Supplier {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  productsCount: number;
  ordersCount: number;
}

interface SupplierFormData {
  name: string;
  description: string;
}

export default function SuppliersPage() {
  const { t, i18n } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    checkUserRole();
    fetchSuppliers();
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

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (sortBy) {
        params.sortBy = sortBy;
      }
      if (sortOrder) {
        params.sortOrder = sortOrder;
      }
      const response = await api.get<{ success: true; data: Supplier[] }>('/suppliers', { params });
      setSuppliers(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('suppliers.loadFailed'));
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
      description: '',
    });
    setShowCreateModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      description: supplier.description || '',
    });
    setShowEditModal(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDeleteModal(true);
  };

  const handleCreateSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t('suppliers.nameRequired'));
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/suppliers', {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });
      toast.success(t('suppliers.createSuccess'));
      setShowCreateModal(false);
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('suppliers.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = () => {
    if (!formData.name.trim()) {
      toast.error(t('suppliers.nameRequired'));
      return;
    }

    // Show confirmation modal instead of directly updating
    setShowUpdateConfirmModal(true);
  };

  const confirmSupplierUpdate = async () => {
    setShowUpdateConfirmModal(false);

    try {
      setSubmitting(true);
      await api.put(`/suppliers/${selectedSupplier?.id}`, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      });
      toast.success(t('suppliers.updateSuccess'));
      setShowEditModal(false);
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('suppliers.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSupplier) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/suppliers/${selectedSupplier.id}`);
      toast.success(t('suppliers.deleteSuccess'));
      setShowDeleteModal(false);
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('suppliers.deleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportSuppliers = () => {
    if (!isAdmin) {
      toast.error(t('common.unauthorized'));
      return;
    }

    try {
      if (suppliers.length === 0) {
        toast.error(t('suppliers.noSuppliersToExport'));
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
      
      const exportData = suppliers.map((supplier) => ({
        [t('suppliers.name')]: supplier.name,
        [t('suppliers.description')]: supplier.description || '-',
        [t('suppliers.productsCount')]: supplier.productsCount || 0,
        [t('suppliers.ordersCount')]: supplier.ordersCount || 0,
        [t('suppliers.createdAt')]: formatDateForExport(supplier.createdAt),
        [t('suppliers.updatedAt')]: formatDateForExport(supplier.updatedAt),
      }));

      const timestamp = new Date().toISOString().split('T')[0];
      exportToExcel(exportData, `proveedores_${timestamp}`, t('suppliers.suppliersList'));
      toast.success(t('suppliers.suppliersExported'));
    } catch (error: any) {
      console.error('Failed to export suppliers:', error);
      toast.error(t('suppliers.exportFailed'));
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(query) ||
      supplier.description?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleRowRightClick = (e: React.MouseEvent, supplier: Supplier) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSupplier(supplier);
    showContextMenu(e, supplier);
  };

  const handleCopyName = () => {
    if (!selectedSupplier) return;
    navigator.clipboard.writeText(selectedSupplier.name);
    toast.success(t('common.copied'));
  };

  const handleCopyDescription = () => {
    if (!selectedSupplier || !selectedSupplier.description) return;
    navigator.clipboard.writeText(selectedSupplier.description);
    toast.success(t('common.copied'));
  };

  const getContextMenuItems = (supplier: Supplier): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (isSuperAdmin) {
      items.push({
        label: t('suppliers.editSupplier'),
        icon: <Edit2 size={16} />,
        action: () => {
          setSelectedSupplier(supplier);
          setFormData({
            name: supplier.name,
            description: supplier.description || '',
          });
          setShowEditModal(true);
        },
      });
    }

    items.push(
      {
        label: t('suppliers.copyName'),
        icon: <Copy size={16} />,
        action: handleCopyName,
      },
      {
        label: t('suppliers.copyDescription'),
        icon: <Copy size={16} />,
        action: handleCopyDescription,
        disabled: !supplier.description,
      }
    );

    if (isSuperAdmin) {
      items.push({ divider: true });
      items.push({
        label: t('suppliers.deleteSupplier'),
        icon: <Trash2 size={16} />,
        action: () => {
          setSelectedSupplier(supplier);
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
          <p>{t('suppliers.loadingSuppliers')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{t('suppliers.title')}</h1>
          <p className="page-subtitle">{t('suppliers.manageSuppliers')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isAdmin && (
            <button
              className="btn-secondary"
              onClick={handleExportSuppliers}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={18} />
              {t('suppliers.exportToExcel')}
            </button>
          )}
          {isSuperAdmin && (
            <button className="btn-primary" onClick={handleCreate}>
              <Plus size={20} />
              {t('suppliers.createSupplier')}
            </button>
          )}
        </div>
      </div>

      <div className="suppliers-toolbar">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder={t('suppliers.searchPlaceholder')}
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

      {filteredSuppliers.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p>{t('suppliers.noSuppliers')}</p>
          {isSuperAdmin && (
            <button className="btn-primary" onClick={handleCreate}>
              <Plus size={20} />
              {t('suppliers.createFirstSupplier')}
            </button>
          )}
        </div>
      ) : (
        <div className="suppliers-list-container">
          <table className="suppliers-table">
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
                <th>{t('common.description')}</th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('productsCount')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t('suppliers.products')}
                    {getSortIcon('productsCount')}
                  </div>
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('ordersCount')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t('suppliers.orders')}
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
                {isSuperAdmin && <th>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr 
                  key={supplier.id} 
                  className="supplier-row"
                  onContextMenu={(e) => handleRowRightClick(e, supplier)}
                >
                  <td>
                    <div className="supplier-name">{supplier.name}</div>
                  </td>
                  <td>
                    <div className="supplier-description">
                      {supplier.description || '-'}
                    </div>
                  </td>
                  <td>
                    <span className="count-badge">{supplier.productsCount}</span>
                  </td>
                  <td>
                    <span className="count-badge">{supplier.ordersCount}</span>
                  </td>
                  <td>{formatDate(supplier.createdAt)}</td>
                  {isSuperAdmin && (
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleEdit(supplier)}
                          title={t('suppliers.editSupplier')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(supplier)}
                          title={t('suppliers.deleteSupplier')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Supplier Modal */}
      {isSuperAdmin && (
        <>
          <ConfirmModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onConfirm={handleCreateSubmit}
            title={t('suppliers.createSupplier')}
            message={
              <div className="supplier-form">
                <div className="form-group">
                  <label>
                    {t('common.name')} <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('suppliers.enterSupplierName')}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('common.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('suppliers.enterDescription')}
                    className="form-input form-textarea"
                    rows={3}
                  />
                </div>
              </div>
            }
            confirmText={t('suppliers.createSupplier')}
            cancelText={t('common.cancel')}
            type="info"
            loading={submitting}
          />

          {/* Edit Supplier Modal */}
          <ConfirmModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedSupplier(null);
            }}
            onConfirm={handleEditSubmit}
            title={t('suppliers.editSupplier')}
            message={
              <div className="supplier-form">
                <div className="form-group">
                  <label>
                    {t('common.name')} <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('suppliers.enterSupplierName')}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('common.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('suppliers.enterDescription')}
                    className="form-input form-textarea"
                    rows={3}
                  />
                </div>
              </div>
            }
            confirmText={t('suppliers.saveChanges')}
            cancelText={t('common.cancel')}
            type="info"
            loading={submitting}
          />

          {/* Delete Supplier Modal */}
          <ConfirmModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedSupplier(null);
            }}
            onConfirm={handleDeleteConfirm}
            title={t('suppliers.deleteSupplier')}
            message={
              <div>
                <p>
                  {t('suppliers.deleteConfirm', { name: selectedSupplier?.name })}
                </p>
                {selectedSupplier && selectedSupplier.ordersCount > 0 && (
                  <p className="warning-text">
                    {t('suppliers.hasOrdersWarning', { count: selectedSupplier.ordersCount })}
                  </p>
                )}
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {t('suppliers.deleteWarning')}
                </p>
              </div>
            }
            confirmText={t('suppliers.deleteSupplier')}
            cancelText={t('common.cancel')}
            type="danger"
            loading={deleteLoading}
          />

          {/* Update Confirmation Modal */}
          <ConfirmModal
            isOpen={showUpdateConfirmModal}
            onClose={() => setShowUpdateConfirmModal(false)}
            onConfirm={confirmSupplierUpdate}
            title={t('suppliers.confirmUpdate')}
            message={
              <div>
                <p>{t('suppliers.confirmUpdateMessage', { name: selectedSupplier?.name })}</p>
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {t('suppliers.updateWarning')}
                </p>
              </div>
            }
            confirmText={t('suppliers.updateSupplier')}
            cancelText={t('common.cancel')}
            type="info"
            loading={submitting}
          />
        </>
      )}

      {/* Context Menu */}
      <ContextMenu
        items={selectedSupplier ? getContextMenuItems(selectedSupplier) : []}
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        onClose={hideContextMenu}
      />
    </div>
  );
}
