import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Loader2, Search, X, Copy } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    checkUserRole();
    fetchSuppliers();
  }, []);

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
      const response = await api.get<{ success: true; data: Supplier[] }>('/suppliers');
      setSuppliers(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
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
      toast.error('Supplier name is required');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/suppliers', {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });
      toast.success('Supplier created successfully');
      setShowCreateModal(false);
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
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
      toast.success('Supplier updated successfully');
      setShowEditModal(false);
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSupplier) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/suppliers/${selectedSupplier.id}`);
      toast.success('Supplier deleted successfully');
      setShowDeleteModal(false);
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete supplier');
    } finally {
      setDeleteLoading(false);
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
    return new Date(dateString).toLocaleDateString();
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
    toast.success('Supplier name copied to clipboard');
  };

  const handleCopyDescription = () => {
    if (!selectedSupplier || !selectedSupplier.description) return;
    navigator.clipboard.writeText(selectedSupplier.description);
    toast.success('Description copied to clipboard');
  };

  const getContextMenuItems = (supplier: Supplier): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (isSuperAdmin) {
      items.push({
        label: 'Edit Supplier',
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
        label: 'Copy Name',
        icon: <Copy size={16} />,
        action: handleCopyName,
      },
      {
        label: 'Copy Description',
        icon: <Copy size={16} />,
        action: handleCopyDescription,
        disabled: !supplier.description,
      }
    );

    if (isSuperAdmin) {
      items.push({ divider: true });
      items.push({
        label: 'Delete Supplier',
        icon: <Trash2 size={16} />,
        action: () => {
          setSelectedSupplier(supplier);
          setShowDeleteModal(true);
        },
        danger: true,
        disabled: supplier.ordersCount > 0,
      });
    }

    return items;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p className="page-subtitle">Manage suppliers and their information</p>
        </div>
        {isSuperAdmin && (
          <button className="btn-primary" onClick={handleCreate}>
            <Plus size={20} />
            Create Supplier
          </button>
        )}
      </div>

      <div className="suppliers-toolbar">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search suppliers by name or description..."
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
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p>No suppliers found</p>
          {isSuperAdmin && (
            <button className="btn-primary" onClick={handleCreate}>
              <Plus size={20} />
              Create First Supplier
            </button>
          )}
        </div>
      ) : (
        <div className="suppliers-list-container">
          <table className="suppliers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Products</th>
                <th>Orders</th>
                <th>Created</th>
                {isSuperAdmin && <th>Actions</th>}
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
                          title="Edit supplier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(supplier)}
                          title="Delete supplier"
                          disabled={supplier.ordersCount > 0}
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
            title="Create New Supplier"
            message={
              <div className="supplier-form">
                <div className="form-group">
                  <label>
                    Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter supplier name"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter supplier description (optional)"
                    className="form-input form-textarea"
                    rows={3}
                  />
                </div>
              </div>
            }
            confirmText="Create Supplier"
            cancelText="Cancel"
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
            title="Edit Supplier"
            message={
              <div className="supplier-form">
                <div className="form-group">
                  <label>
                    Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter supplier name"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter supplier description (optional)"
                    className="form-input form-textarea"
                    rows={3}
                  />
                </div>
              </div>
            }
            confirmText="Save Changes"
            cancelText="Cancel"
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
            title="Delete Supplier"
            message={
              <div>
                <p>
                  Are you sure you want to delete supplier <strong>{selectedSupplier?.name}</strong>?
                </p>
                {selectedSupplier && selectedSupplier.ordersCount > 0 && (
                  <p className="warning-text">
                    This supplier has {selectedSupplier.ordersCount} order(s). You cannot delete it until all orders are removed.
                  </p>
                )}
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  This action will be permanently recorded in the system logs and cannot be reversed.
                </p>
              </div>
            }
            confirmText="Delete Supplier"
            cancelText="Cancel"
            type="danger"
            loading={deleteLoading}
          />

          {/* Update Confirmation Modal */}
          <ConfirmModal
            isOpen={showUpdateConfirmModal}
            onClose={() => setShowUpdateConfirmModal(false)}
            onConfirm={confirmSupplierUpdate}
            title="Confirm Supplier Update"
            message={
              <div>
                <p>Are you sure you want to update supplier <strong>{selectedSupplier?.name}</strong>?</p>
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  All changes will be saved and this action will be recorded in the system logs.
                </p>
              </div>
            }
            confirmText="Update Supplier"
            cancelText="Cancel"
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
