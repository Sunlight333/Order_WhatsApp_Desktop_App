import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, User as UserIcon, Loader2, Search, X } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/users.css';

interface User {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'USER';
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  username: string;
  password: string;
  role: 'SUPER_ADMIN' | 'USER';
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    role: 'USER',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ success: true; data: User[] }>('/users');
      setUsers(response.data.data || []);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('You do not have permission to access this page');
      } else {
        toast.error(error.response?.data?.error?.message || 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      username: '',
      password: '',
      role: 'USER',
    });
    setShowCreateModal(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
    });
    setShowEditModal(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleCreateSubmit = async () => {
    if (!formData.username.trim() || !formData.password.trim()) {
      toast.error('Username and password are required');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/users', formData);
      toast.success('User created successfully');
      setShowCreateModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    if (formData.password.trim() && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      const updateData: any = {
        username: formData.username,
        role: formData.role,
      };

      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      await api.put(`/users/${selectedUser?.id}`, updateData);
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/users/${selectedUser.id}`);
      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="page-subtitle">Manage system users and permissions</p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          <Plus size={20} />
          Create User
        </button>
      </div>

      <div className="users-toolbar">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search users by username or role..."
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

      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <UserIcon size={48} />
          <p>No users found</p>
          <button className="btn-primary" onClick={handleCreate}>
            <Plus size={20} />
            Create First User
          </button>
        </div>
      ) : (
        <div className="users-list-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Created</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="user-row">
                  <td>
                    <div className="user-info">
                      {user.role === 'SUPER_ADMIN' ? (
                        <Shield size={18} className="role-icon admin" />
                      ) : (
                        <UserIcon size={18} className="role-icon user" />
                      )}
                      <span className="username">{user.username}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${user.role === 'SUPER_ADMIN' ? 'admin' : 'user'}`}>
                      {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'User'}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>{formatDate(user.updatedAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon btn-edit"
                        onClick={() => handleEdit(user)}
                        title="Edit user"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleDelete(user)}
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      <ConfirmModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreateSubmit}
        title="Create New User"
        message={
          <div className="user-form">
            <div className="form-group">
              <label>
                Username <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>
                Password <span className="required">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password (min 6 characters)"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>
                Role <span className="required">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'SUPER_ADMIN' | 'USER' })}
                className="form-input"
              >
                <option value="USER">User</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          </div>
        }
        confirmText="Create User"
        cancelText="Cancel"
        type="info"
        loading={submitting}
      />

      {/* Edit User Modal */}
      <ConfirmModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        onConfirm={handleEditSubmit}
        title="Edit User"
        message={
          <div className="user-form">
            <div className="form-group">
              <label>
                Username <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Password (leave empty to keep current)</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter new password (min 6 characters)"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>
                Role <span className="required">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'SUPER_ADMIN' | 'USER' })}
                className="form-input"
              >
                <option value="USER">User</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          </div>
        }
        confirmText="Save Changes"
        cancelText="Cancel"
        type="info"
        loading={submitting}
      />

      {/* Delete User Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={
          <p>
            Are you sure you want to delete user <strong>{selectedUser?.username}</strong>? This action cannot be undone.
          </p>
        }
        confirmText="Delete User"
        cancelText="Cancel"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
