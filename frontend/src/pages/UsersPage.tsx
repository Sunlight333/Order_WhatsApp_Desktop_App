import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Shield, User as UserIcon, Loader2, Search, X, Upload, Image as ImageIcon, Copy } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import { configService } from '../services/config.service';
import '../styles/users.css';

// Helper function to get full avatar URL
function getAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  const serverBaseUrl = configService.getServerBaseUrl();
  return `${serverBaseUrl}${avatarPath}`;
}

interface User {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'USER';
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  username: string;
  password: string;
  role: 'SUPER_ADMIN' | 'USER';
  avatar?: File | null;
  avatarPreview?: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    role: 'USER',
    avatar: null,
    avatarPreview: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

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
      avatar: null,
      avatarPreview: null,
    });
    setShowCreateModal(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      avatar: null,
      avatarPreview: user.avatar ? getAvatarUrl(user.avatar) : null,
    });
    setShowEditModal(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      setFormData({
        ...formData,
        avatar: file,
        avatarPreview: URL.createObjectURL(file),
      });
    }
  };

  const handleRemoveAvatar = () => {
    setFormData({
      ...formData,
      avatar: null,
      avatarPreview: null,
    });
    if (avatarInputRef.current) avatarInputRef.current.value = '';
    if (editAvatarInputRef.current) editAvatarInputRef.current.value = '';
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
      
      // Create user first
      const userData: any = {
        username: formData.username,
        password: formData.password,
        role: formData.role,
      };
      
      const response = await api.post('/users', userData);
      const newUser = response.data.data;

      // Upload avatar if provided
      if (formData.avatar) {
        const formDataUpload = new FormData();
        formDataUpload.append('avatar', formData.avatar);
        
        await api.post(`/users/${newUser.id}/avatar`, formDataUpload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      toast.success('User created successfully');
      setShowCreateModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = () => {
    // Validate first
    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    if (formData.password.trim() && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Show confirmation modal instead of directly updating
    setShowUpdateConfirmModal(true);
  };

  const confirmUserUpdate = async () => {
    setShowUpdateConfirmModal(false);

    try {
      setSubmitting(true);
      const updateData: any = {
        username: formData.username,
        role: formData.role,
      };

      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      // Update user data
      await api.put(`/users/${selectedUser?.id}`, updateData);

      // Upload new avatar if provided
      if (formData.avatar) {
        const formDataUpload = new FormData();
        formDataUpload.append('avatar', formData.avatar);
        
        await api.post(`/users/${selectedUser?.id}/avatar`, formDataUpload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

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

  const handleRowRightClick = (e: React.MouseEvent, user: User) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedUser(user);
    showContextMenu(e, user);
  };

  const handleCopyUsername = () => {
    if (!selectedUser) return;
    navigator.clipboard.writeText(selectedUser.username);
    toast.success('Username copied to clipboard');
  };

  const handleCopyUserId = () => {
    if (!selectedUser) return;
    navigator.clipboard.writeText(selectedUser.id);
    toast.success('User ID copied to clipboard');
  };

  const getContextMenuItems = (user: User): ContextMenuItem[] => {
    return [
      {
        label: 'Edit User',
        icon: <Edit2 size={16} />,
        action: () => {
          setSelectedUser(user);
          setFormData({
            username: user.username,
            password: '',
            role: user.role,
            avatar: null,
            avatarPreview: user.avatar ? getAvatarUrl(user.avatar) : null,
          });
          setShowEditModal(true);
        },
      },
      { divider: true },
      {
        label: 'Copy Username',
        icon: <Copy size={16} />,
        action: handleCopyUsername,
      },
      {
        label: 'Copy User ID',
        icon: <Copy size={16} />,
        action: handleCopyUserId,
      },
      { divider: true },
      {
        label: 'Delete User',
        icon: <Trash2 size={16} />,
        action: () => {
          setSelectedUser(user);
          setShowDeleteModal(true);
        },
        danger: true,
      },
    ];
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
                <tr 
                  key={user.id} 
                  className="user-row"
                  onContextMenu={(e) => handleRowRightClick(e, user)}
                >
                  <td>
                    <div className="user-info">
                      {user.avatar ? (
                        <img 
                          src={getAvatarUrl(user.avatar) || ''} 
                          alt={user.username}
                          className="user-avatar"
                        />
                      ) : user.role === 'SUPER_ADMIN' ? (
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
              <label>Avatar (Optional)</label>
              <div className="avatar-upload-container">
                {formData.avatarPreview ? (
                  <div className="avatar-preview">
                    <img src={formData.avatarPreview} alt="Avatar preview" />
                    <button
                      type="button"
                      className="btn-remove-avatar"
                      onClick={handleRemoveAvatar}
                      title="Remove avatar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="avatar-placeholder">
                    <ImageIcon size={24} />
                    <span>No avatar</span>
                  </div>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarChange(e, false)}
                  className="avatar-input"
                  id="avatar-upload"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn-upload-avatar"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Upload size={16} />
                  {formData.avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
                </button>
              </div>
            </div>
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
              <label>Avatar (Optional)</label>
              <div className="avatar-upload-container">
                {formData.avatarPreview ? (
                  <div className="avatar-preview">
                    <img src={formData.avatarPreview} alt="Avatar preview" />
                    <button
                      type="button"
                      className="btn-remove-avatar"
                      onClick={handleRemoveAvatar}
                      title="Remove avatar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="avatar-placeholder">
                    <ImageIcon size={24} />
                    <span>No avatar</span>
                  </div>
                )}
                <input
                  ref={editAvatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarChange(e, true)}
                  className="avatar-input"
                  id="edit-avatar-upload"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn-upload-avatar"
                  onClick={() => editAvatarInputRef.current?.click()}
                >
                  <Upload size={16} />
                  {formData.avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
                </button>
              </div>
            </div>
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
          <div>
            <p>
              Are you sure you want to delete user <strong>{selectedUser?.username}</strong>? This action cannot be undone.
            </p>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              This action will be permanently recorded in the system logs and cannot be reversed.
            </p>
          </div>
        }
        confirmText="Delete User"
        cancelText="Cancel"
        type="danger"
        loading={deleteLoading}
      />

      {/* Update Confirmation Modal */}
      <ConfirmModal
        isOpen={showUpdateConfirmModal}
        onClose={() => setShowUpdateConfirmModal(false)}
        onConfirm={confirmUserUpdate}
        title="Confirm User Update"
        message={
          <div>
            <p>Are you sure you want to update user <strong>{selectedUser?.username}</strong>?</p>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              All changes will be saved and this action will be recorded in the system logs.
            </p>
          </div>
        }
        confirmText="Update User"
        cancelText="Cancel"
        type="info"
        loading={submitting}
      />

      {/* Context Menu */}
      <ContextMenu
        items={selectedUser ? getContextMenuItems(selectedUser) : []}
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        onClose={hideContextMenu}
      />
    </div>
  );
}
