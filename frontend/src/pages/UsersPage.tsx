import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Shield, User as UserIcon, Loader2, Search, X, Upload, Image as ImageIcon, Copy, ArrowUp, ArrowDown, ChevronUp, Download } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import { configService } from '../services/config.service';
import { exportToExcel } from '../utils/excelExport';
import { useAuthStore } from '../store/authStore';
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
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const handleExportUsers = () => {
    if (!isAdmin) {
      toast.error(t('common.unauthorized'));
      return;
    }

    try {
      if (users.length === 0) {
        toast.error(t('users.noUsersToExport'));
        return;
      }

      const exportData = users.map((user) => ({
        [t('users.username')]: user.username,
        [t('users.role')]: user.role === 'SUPER_ADMIN' ? t('users.superAdmin') : t('users.userRole'),
        [t('users.createdAt')]: new Date(user.createdAt).toLocaleString(),
        [t('users.updatedAt')]: new Date(user.updatedAt).toLocaleString(),
      }));

      const timestamp = new Date().toISOString().split('T')[0];
      exportToExcel(exportData, `usuarios_${timestamp}`, t('users.usersList'));
      toast.success(t('users.usersExported'));
    } catch (error: any) {
      console.error('Failed to export users:', error);
      toast.error(t('users.exportFailed'));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (sortBy) {
        params.sortBy = sortBy;
      }
      if (sortOrder) {
        params.sortOrder = sortOrder;
      }
      const response = await api.get<{ success: true; data: User[] }>('/users', { params });
      setUsers(response.data.data || []);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error(t('users.noPermission'));
      } else {
        toast.error(error.response?.data?.error?.message || t('users.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
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
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ChevronUp size={14} style={{ opacity: 0.3 }} />;
    }
    return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
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
        toast.error(t('users.selectImageFile'));
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('users.imageSizeLimit'));
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
      toast.error(t('users.usernamePasswordRequired'));
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

      toast.success(t('users.createSuccess'));
      setShowCreateModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('users.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = () => {
    // Validate first
    if (!formData.username.trim()) {
      toast.error(t('validation.required'));
      return;
    }

    if (formData.password.trim() && formData.password.length < 6) {
      toast.error(t('validation.minLength', { min: 6 }));
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

      toast.success(t('users.updateSuccess'));
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('users.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      setDeleteLoading(true);
      await api.delete(`/users/${selectedUser.id}`);
      toast.success(t('users.deleteSuccess'));
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('users.deleteFailed'));
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
    toast.success(t('common.copied'));
  };

  const handleCopyUserId = () => {
    if (!selectedUser) return;
    navigator.clipboard.writeText(selectedUser.id);
    toast.success(t('common.copied'));
  };

  const getContextMenuItems = (user: User): ContextMenuItem[] => {
    return [
      {
        label: t('users.editUser'),
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
        label: t('users.copyUsername'),
        icon: <Copy size={16} />,
        action: handleCopyUsername,
      },
      {
        label: t('users.copyUserId'),
        icon: <Copy size={16} />,
        action: handleCopyUserId,
      },
      { divider: true },
      {
        label: t('users.deleteUser'),
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
          <p>{t('users.loadingUsers')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{t('users.userManagement')}</h1>
          <p className="page-subtitle">{t('users.manageUsers')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isAdmin && (
            <button
              className="btn-secondary"
              onClick={handleExportUsers}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={18} />
              {t('users.exportToExcel')}
            </button>
          )}
          <button className="btn-primary" onClick={handleCreate}>
            <Plus size={20} />
            {t('users.createUser')}
          </button>
        </div>
      </div>

      <div className="users-toolbar">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder={t('users.searchPlaceholder')}
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

      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <UserIcon size={48} />
          <p>{t('users.noUsers')}</p>
          <button className="btn-primary" onClick={handleCreate}>
            <Plus size={20} />
            {t('users.createFirstUser')}
          </button>
        </div>
      ) : (
        <div className="users-list-container">
          <table className="users-table">
            <thead>
              <tr>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('username')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t('users.username')}
                    {getSortIcon('username')}
                  </div>
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('role')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t('users.role')}
                    {getSortIcon('role')}
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
                    {t('orders.updatedAt')}
                    {getSortIcon('updatedAt')}
                  </div>
                </th>
                <th>{t('common.actions')}</th>
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
                      {user.role === 'SUPER_ADMIN' ? t('users.superAdmin') : t('users.userRole')}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>{formatDate(user.updatedAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon btn-edit"
                        onClick={() => handleEdit(user)}
                        title={t('users.editUser')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleDelete(user)}
                        title={t('users.deleteUser')}
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
        title={t('users.createUser')}
        message={
          <div className="user-form">
            <div className="form-group">
              <label>{t('users.avatarOptional')}</label>
              <div className="avatar-upload-container">
                {formData.avatarPreview ? (
                  <div className="avatar-preview">
                    <img src={formData.avatarPreview} alt={t('users.avatarPreview')} />
                    <button
                      type="button"
                      className="btn-remove-avatar"
                      onClick={handleRemoveAvatar}
                      title={t('users.removeAvatar')}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="avatar-placeholder">
                    <ImageIcon size={24} />
                    <span>{t('users.noAvatar')}</span>
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
                  {formData.avatarPreview ? t('users.changeAvatar') : t('users.uploadAvatar')}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>
                {t('users.username')} <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder={t('users.enterUsername')}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>
                {t('users.password')} <span className="required">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('users.enterPassword')}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>
                {t('users.role')} <span className="required">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'SUPER_ADMIN' | 'USER' })}
                className="form-input"
              >
                <option value="USER">{t('users.userRole')}</option>
                <option value="SUPER_ADMIN">{t('users.superAdmin')}</option>
              </select>
            </div>
          </div>
        }
        confirmText={t('users.createUser')}
        cancelText={t('common.cancel')}
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
        title={t('users.editUser')}
        message={
          <div className="user-form">
            <div className="form-group">
              <label>{t('users.avatarOptional')}</label>
              <div className="avatar-upload-container">
                {formData.avatarPreview ? (
                  <div className="avatar-preview">
                    <img src={formData.avatarPreview} alt={t('users.avatarPreview')} />
                    <button
                      type="button"
                      className="btn-remove-avatar"
                      onClick={handleRemoveAvatar}
                      title={t('users.removeAvatar')}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="avatar-placeholder">
                    <ImageIcon size={24} />
                    <span>{t('users.noAvatar')}</span>
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
                  {formData.avatarPreview ? t('users.changeAvatar') : t('users.uploadAvatar')}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>
                {t('users.username')} <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder={t('users.enterUsername')}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label>{t('users.passwordKeepCurrent')}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('users.enterNewPassword')}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>
                {t('users.role')} <span className="required">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'SUPER_ADMIN' | 'USER' })}
                className="form-input"
              >
                <option value="USER">{t('users.userRole')}</option>
                <option value="SUPER_ADMIN">{t('users.superAdmin')}</option>
              </select>
            </div>
          </div>
        }
        confirmText={t('editOrder.saveChanges')}
        cancelText={t('common.cancel')}
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
        title={t('users.deleteUser')}
        message={
          <div>
            <p>
              {t('users.deleteConfirm', { username: selectedUser?.username })}
            </p>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {t('users.deleteWarning')}
            </p>
          </div>
        }
        confirmText={t('users.deleteUser')}
        cancelText={t('common.cancel')}
        type="danger"
        loading={deleteLoading}
      />

      {/* Update Confirmation Modal */}
      <ConfirmModal
        isOpen={showUpdateConfirmModal}
        onClose={() => setShowUpdateConfirmModal(false)}
        onConfirm={confirmUserUpdate}
        title={t('users.updateConfirm')}
        message={
          <div>
            <p>{t('users.updateConfirmMessage', { username: selectedUser?.username })}</p>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {t('users.updateWarning')}
            </p>
          </div>
        }
        confirmText={t('users.updateUser')}
        cancelText={t('common.cancel')}
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
