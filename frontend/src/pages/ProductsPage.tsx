import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Loader2, Search, X, Filter } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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

  useEffect(() => {
    checkUserRole();
    fetchSuppliers();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchProducts(selectedSupplierFilter || undefined);
  }, [selectedSupplierFilter]);

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
      const params = supplierId ? { supplierId } : {};
      const response = await api.get<{ success: true; data: Product[] }>('/products', { params });
      setProducts(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
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
      toast.error('Please select a supplier');
      return;
    }

    if (!formData.reference.trim()) {
      toast.error('Product reference is required');
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
      toast.success('Product created successfully');
      setShowCreateModal(false);
      fetchProducts(selectedSupplierFilter || undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!formData.reference.trim()) {
      toast.error('Product reference is required');
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/products/${selectedProduct?.id}`, {
        reference: formData.reference.trim(),
        description: formData.description.trim() || null,
        defaultPrice: formData.defaultPrice.trim() || null,
      });
      toast.success('Product updated successfully');
      setShowEditModal(false);
      setSelectedProduct(null);
      fetchProducts(selectedSupplierFilter || undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/products/${selectedProduct.id}`);
      toast.success('Product deleted successfully');
      setShowDeleteModal(false);
      setSelectedProduct(null);
      fetchProducts(selectedSupplierFilter || undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete product');
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

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p className="page-subtitle">Manage products by supplier</p>
        </div>
        {isSuperAdmin && (
          <button className="btn-primary" onClick={handleCreate}>
            <Plus size={20} />
            Create Product
          </button>
        )}
      </div>

      <div className="products-toolbar">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search products by reference, description, or supplier..."
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
        <div className="filter-container">
          <Filter size={18} />
          <select
            value={selectedSupplierFilter}
            onChange={(e) => setSelectedSupplierFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Suppliers</option>
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
          <p>No products found</p>
          {selectedSupplierFilter && (
            <p className="empty-subtitle">
              {suppliers.find((s) => s.id === selectedSupplierFilter)?.name}
            </p>
          )}
          {isSuperAdmin && (
            <button className="btn-primary" onClick={handleCreate}>
              <Plus size={20} />
              Create First Product
            </button>
          )}
        </div>
      ) : (
        <div className="products-list-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Supplier</th>
                <th>Description</th>
                <th>Default Price</th>
                {isSuperAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="product-row">
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
                      {product.defaultPrice ? `$${product.defaultPrice}` : '-'}
                    </div>
                  </td>
                  {isSuperAdmin && (
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleEdit(product)}
                          title="Edit product"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(product)}
                          title="Delete product"
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

      {/* Create Product Modal */}
      {isSuperAdmin && (
        <>
          <ConfirmModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onConfirm={handleCreateSubmit}
            title="Create New Product"
            message={
              <div className="product-form">
                <div className="form-group">
                  <label>
                    Supplier <span className="required">*</span>
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="form-input"
                    required
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    Product Reference <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Enter product reference"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter product description (optional)"
                    className="form-input form-textarea"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Default Price</label>
                  <input
                    type="text"
                    value={formData.defaultPrice}
                    onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
                    placeholder="e.g., 29.99"
                    className="form-input"
                  />
                </div>
              </div>
            }
            confirmText="Create Product"
            cancelText="Cancel"
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
            title="Edit Product"
            message={
              <div className="product-form">
                <div className="form-group">
                  <label>Supplier</label>
                  <input
                    type="text"
                    value={suppliers.find((s) => s.id === formData.supplierId)?.name || ''}
                    disabled
                    className="form-input"
                  />
                  <small className="form-hint">Supplier cannot be changed after creation</small>
                </div>
                <div className="form-group">
                  <label>
                    Product Reference <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Enter product reference"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter product description (optional)"
                    className="form-input form-textarea"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Default Price</label>
                  <input
                    type="text"
                    value={formData.defaultPrice}
                    onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
                    placeholder="e.g., 29.99"
                    className="form-input"
                  />
                </div>
              </div>
            }
            confirmText="Save Changes"
            cancelText="Cancel"
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
            title="Delete Product"
            message={
              <p>
                Are you sure you want to delete product <strong>{selectedProduct?.reference}</strong>? This action cannot be undone.
              </p>
            }
            confirmText="Delete Product"
            cancelText="Cancel"
            type="danger"
            loading={deleteLoading}
          />
        </>
      )}
    </div>
  );
}
