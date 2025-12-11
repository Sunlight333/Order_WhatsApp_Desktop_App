import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Package, Loader2, Search, X, Filter, Copy, ArrowUp, ArrowDown, ChevronUp } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import '../styles/products.css';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  supplierId: string;
  reference: string;
  description?: string;
  defaultPrice?: string;
  supplier: {
    id: string;
    name: string;
  };
}

interface ProductFormData {
  supplierId: string;
  reference: string;
  description: string;
  defaultPrice: string;
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('reference');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    supplierId: '',
    reference: '',
    description: '',
    defaultPrice: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  useEffect(() => {
    checkUserRole();
    fetchSuppliers();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchProducts(selectedSupplierFilter || undefined);
  }, [selectedSupplierFilter, sortBy, sortOrder]);

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
      const response = await api.get<{ success: true; data: Supplier[] }>('/suppliers');
      setSuppliers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchProducts = async (supplierId?: string) => {
    try {
      setLoading(true);
      const params: any = supplierId ? { supplierId } : {};
      if (sortBy) {
        params.sortBy = sortBy;
      }
      if (sortOrder) {
        params.sortOrder = sortOrder;
      }
      const response = await api.get<{ success: true; data: Product[] }>('/products', { params });
      setProducts(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('products.loadFailed'));
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
      supplierId: selectedSupplierFilter || '',
      reference: '',
      description: '',
      defaultPrice: '',
    });
    setShowCreateModal(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      supplierId: product.supplierId,
      reference: product.reference,
      description: product.description || '',
      defaultPrice: product.defaultPrice || '',
    });
    setShowEditModal(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleCreateSubmit = async () => {
    if (!formData.supplierId) {
      toast.error(t('products.selectSupplier'));
      return;
    }

    if (!formData.reference.trim()) {
      toast.error(t('products.referenceRequired'));
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/products', {
        supplierId: formData.supplierId,
        reference: formData.reference.trim(),
        description: formData.description.trim() || undefined,
        defaultPrice: formData.defaultPrice.trim() || undefined,
      });
      toast.success(t('products.createSuccess'));
      setShowCreateModal(false);
      fetchProducts(selectedSupplierFilter || undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('products.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = () => {
    if (!formData.reference.trim()) {
      toast.error(t('products.referenceRequired'));
      return;
    }

    // Show confirmation modal instead of directly updating
    setShowUpdateConfirmModal(true);
  };

  const confirmProductUpdate = async () => {
    setShowUpdateConfirmModal(false);

    try {
      setSubmitting(true);
      await api.put(`/products/${selectedProduct?.id}`, {
        reference: formData.reference.trim(),
        description: formData.description.trim() || null,
        defaultPrice: formData.defaultPrice.trim() || null,
      });
      toast.success(t('products.updateSuccess'));
      setShowEditModal(false);
      setSelectedProduct(null);
      fetchProducts(selectedSupplierFilter || undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('products.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/products/${selectedProduct.id}`);
      toast.success(t('products.deleteSuccess'));
      setShowDeleteModal(false);
      setSelectedProduct(null);
      fetchProducts(selectedSupplierFilter || undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('products.deleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.reference.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.supplier.name.toLowerCase().includes(query)
    );
  });

  const handleRowRightClick = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProduct(product);
    showContextMenu(e, product);
  };

  const handleCopyReference = () => {
    if (!selectedProduct) return;
    navigator.clipboard.writeText(selectedProduct.reference);
    toast.success(t('common.copied'));
  };

  const handleCopyDescription = () => {
    if (!selectedProduct || !selectedProduct.description) return;
    navigator.clipboard.writeText(selectedProduct.description);
    toast.success(t('common.copied'));
  };

  const getContextMenuItems = (product: Product): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (isSuperAdmin) {
      items.push({
        label: t('products.editProduct'),
        icon: <Edit2 size={16} />,
        action: () => {
          setSelectedProduct(product);
          setFormData({
            supplierId: product.supplierId,
            reference: product.reference,
            description: product.description || '',
            defaultPrice: product.defaultPrice || '',
          });
          setShowEditModal(true);
        },
      });
    }

    items.push(
      {
        label: t('products.copyReference'),
        icon: <Copy size={16} />,
        action: handleCopyReference,
      },
      {
        label: t('products.copyDescription'),
        icon: <Copy size={16} />,
        action: handleCopyDescription,
        disabled: !product.description,
      }
    );

    if (isSuperAdmin) {
      items.push({ divider: true });
      items.push({
        label: t('products.deleteProduct'),
        icon: <Trash2 size={16} />,
        action: () => {
          setSelectedProduct(product);
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
          <p>{t('products.loadingProducts')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{t('products.title')}</h1>
          <p className="page-subtitle">{t('products.manageProducts')}</p>
        </div>
        {isSuperAdmin && (
          <button className="btn-primary" onClick={handleCreate}>
            <Plus size={20} />
            {t('products.createProduct')}
          </button>
        )}
      </div>

      <div className="products-toolbar">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder={t('products.searchPlaceholder')}
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
        <div className="filter-container">
          <Filter size={18} />
          <select
            value={selectedSupplierFilter}
            onChange={(e) => setSelectedSupplierFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">{t('products.allSuppliers')}</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p>{t('products.noProducts')}</p>
          {selectedSupplierFilter && (
            <p className="empty-subtitle">
              {suppliers.find((s) => s.id === selectedSupplierFilter)?.name}
            </p>
          )}
          {isSuperAdmin && (
            <button className="btn-primary" onClick={handleCreate}>
              <Plus size={20} />
              {t('products.createFirstProduct')}
            </button>
          )}
        </div>
      ) : (
        <div className="products-list-container">
          <table className="products-table">
            <thead>
              <tr>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('reference')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t('products.reference')}
                    {getSortIcon('reference')}
                  </div>
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('supplier')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t('products.supplier')}
                    {getSortIcon('supplier')}
                  </div>
                </th>
                <th>{t('common.description')}</th>
                <th>{t('products.defaultPrice')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr 
                  key={product.id} 
                  className="product-row"
                  onContextMenu={(e) => handleRowRightClick(e, product)}
                >
                  <td>
                    <div className="product-reference">{product.reference}</div>
                  </td>
                  <td>
                    <div className="product-supplier">{product.supplier.name}</div>
                  </td>
                  <td>
                    <div className="product-description">
                      {product.description || '-'}
                    </div>
                  </td>
                  <td>
                    <div className="product-price">
                      {product.defaultPrice ? `€${product.defaultPrice}` : '-'}
                    </div>
                  </td>
                  <td>
                    {isSuperAdmin ? (
                      <div className="action-buttons">
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleEdit(product)}
                          title={t('products.editProduct')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(product)}
                          title={t('products.deleteProduct')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-disabled)' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Product Modal */}
      {isSuperAdmin && (
        <>
          <ConfirmModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onConfirm={handleCreateSubmit}
            title={t('products.createProduct')}
            message={
              <div className="product-form">
                <div className="form-group">
                  <label>
                    {t('products.supplier')} <span className="required">*</span>
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="form-input"
                    required
                  >
                    <option value="">{t('products.selectSupplier')}</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    {t('products.reference')} <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder={t('products.enterReference')}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('common.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('products.enterDescription')}
                    className="form-input form-textarea"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>{t('products.defaultPrice')}</label>
                  <input
                    type="text"
                    value={formData.defaultPrice}
                    onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
                    placeholder={t('products.enterDefaultPrice')}
                    className="form-input"
                  />
                </div>
              </div>
            }
            confirmText={t('products.createProduct')}
            cancelText={t('common.cancel')}
            type="info"
            loading={submitting}
          />

          {/* Edit Product Modal */}
          <ConfirmModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedProduct(null);
            }}
            onConfirm={handleEditSubmit}
            title={t('products.editProduct')}
            message={
              <div className="product-form">
                <div className="form-group">
                  <label>{t('products.supplier')}</label>
                  <input
                    type="text"
                    value={suppliers.find((s) => s.id === formData.supplierId)?.name || ''}
                    disabled
                    className="form-input"
                  />
                  <small className="form-hint">{t('products.supplierCannotChange')}</small>
                </div>
                <div className="form-group">
                  <label>
                    {t('products.reference')} <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder={t('products.enterReference')}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('common.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('products.enterDescription')}
                    className="form-input form-textarea"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>{t('products.defaultPrice')}</label>
                  <input
                    type="text"
                    value={formData.defaultPrice}
                    onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
                    placeholder={t('products.enterDefaultPrice')}
                    className="form-input"
                  />
                </div>
              </div>
            }
            confirmText={t('products.saveChanges')}
            cancelText={t('common.cancel')}
            type="info"
            loading={submitting}
          />

          {/* Delete Product Modal */}
          <ConfirmModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedProduct(null);
            }}
            onConfirm={handleDeleteConfirm}
            title={t('products.deleteProduct')}
            message={
              <div>
                <p>
                  {t('products.deleteConfirm', { reference: selectedProduct?.reference })}
                </p>
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {t('products.deleteWarning')}
                </p>
              </div>
            }
            confirmText={t('products.deleteProduct')}
            cancelText={t('common.cancel')}
            type="danger"
            loading={deleteLoading}
          />

          {/* Update Confirmation Modal */}
          <ConfirmModal
            isOpen={showUpdateConfirmModal}
            onClose={() => setShowUpdateConfirmModal(false)}
            onConfirm={confirmProductUpdate}
            title={t('products.confirmUpdate')}
            message={
              <div>
                <p>{t('products.confirmUpdateMessage', { reference: selectedProduct?.reference })}</p>
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {t('products.updateWarning')}
                </p>
              </div>
            }
            confirmText={t('products.updateProduct')}
            cancelText={t('common.cancel')}
            type="info"
            loading={submitting}
          />
        </>
      )}

      {/* Context Menu */}
      <ContextMenu
        items={selectedProduct ? getContextMenuItems(selectedProduct) : []}
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        onClose={hideContextMenu}
      />
    </div>
  );
}
