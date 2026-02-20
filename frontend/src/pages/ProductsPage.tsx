import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Package, Loader2, Search, X, Filter, Copy, ArrowUp, ArrowDown, ChevronUp, Download, ChevronDown, ChevronUp as ChevronUpIcon, ChevronDown as ChevronDownIcon, FileText, Building2, User, Calendar, Hash } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import { exportToExcel, exportMultipleSheets } from '../utils/excelExport';
import { useAuthStore } from '../store/authStore';
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

interface PendingProduct {
  id: string;
  orderId: string;
  orderNumber: number | null;
  productRef: string;
  supplierId: string;
  supplierName: string;
  quantity: string;
  receivedQuantity: string | null;
  pendingQuantity: number;
  customerName: string | null;
  customerId: string | null;
  customerPhone: string | null;
  orderStatus: string;
  productDescription: string | null;
  createdAt?: string;
  createdBy?: {
    id: string;
    username: string;
  } | null;
}

interface ProductFormData {
  supplierId: string;
  reference: string;
  description: string;
  defaultPrice: string;
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  // Removed expandedSections - filters are now always visible in compact layout
  // Advanced filters
  const [referenceFilter, setReferenceFilter] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [createdByFilter, setCreatedByFilter] = useState<string>('');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [orderNumberFilter, setOrderNumberFilter] = useState<string>('');
  const [customersList, setCustomersList] = useState<Array<{ id: string; name: string }>>([]);
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
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    checkUserRole();
    fetchSuppliers();
    fetchPendingProducts();
    // Fetch regular products for admin users (for management features)
    if (isAdmin) {
      fetchProducts();
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
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
      const response = await api.get<{ success: true; data: Supplier[] }>('/suppliers');
      setSuppliers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ success: true; data: PendingProduct[] }>('/products/pending');
      setPendingProducts(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('products.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get<{ success: true; data: Array<{ id: string; name: string }> }>('/customers/search');
      setCustomersList(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchProducts = async (supplierId?: string) => {
    try {
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


  const handleExportOrdersBySupplierMonth = async () => {
    if (!isAdmin) {
      toast.error(t('common.unauthorized'));
      return;
    }

    try {
      // Fetch orders by supplier and month analytics
      // Use current year by default, all months
      const currentYear = new Date().getFullYear();
      const response = await api.get('/analytics/supplier-monthly', {
        params: {
          year: currentYear,
        }
      });
      
      if (!response.data.success) {
        toast.error(t('products.exportFailed'));
        return;
      }

      const data = response.data.data || [];
      if (data.length === 0) {
        toast.error(t('products.noDataToExport'));
        return;
      }

      const sheets = [];
      
      // Sheet 1: Detailed data
      const detailedData = data.flatMap((supplier: any) => 
        (supplier.monthlyData || []).map((monthData: any) => ({
          [t('products.supplier')]: supplier.supplierName,
          [t('orders.month')]: monthData.month || '-',
          [t('orders.orderCount')]: monthData.orderCount || 0,
          [t('dashboard.totalAmount')]: monthData.totalAmount || 0,
        }))
      );
      
      if (detailedData.length > 0) {
        // Excel sheet names cannot exceed 31 characters
        const sheetName = t('products.ordersBySupplierMonth');
        sheets.push({
          name: sheetName.length > 31 ? sheetName.substring(0, 31) : sheetName,
          data: detailedData,
        });
      }

      // Sheet 2: Pivot table (Month x Supplier)
      const supplierNames: string[] = [...new Set(data.map((s: any) => String(s.supplierName)))] as string[];
      supplierNames.sort();
      const allMonths = new Set<string>();
      data.forEach((s: any) => {
        (s.monthlyData || []).forEach((md: any) => {
          if (md.month) allMonths.add(md.month as string);
        });
      });
      const months = Array.from(allMonths).sort();

      const pivotData: Record<string, any>[] = [];
      months.forEach((month) => {
        const row: Record<string, any> = { [t('orders.month')]: month };
        let monthTotal = 0;
        supplierNames.forEach((supplierName) => {
          const supplier = data.find((s: any) => s.supplierName === supplierName);
          const monthData = supplier?.monthlyData?.find((md: any) => md.month === month);
          const count = monthData?.orderCount || 0;
          row[supplierName] = count;
          monthTotal += count;
        });
        row[t('orders.supplierTotal')] = monthTotal;
        pivotData.push(row);
      });

      // Add totals row
      if (pivotData.length > 0) {
        const totalsRow: Record<string, any> = { [t('orders.month')]: t('orders.supplierTotal') };
        let grandTotal = 0;
        supplierNames.forEach((supplierName) => {
          let supplierTotal = 0;
          pivotData.forEach((row) => {
            supplierTotal += (row[supplierName] as number) || 0;
          });
          totalsRow[supplierName] = supplierTotal;
          grandTotal += supplierTotal;
        });
        totalsRow[t('orders.supplierTotal')] = grandTotal;
        pivotData.push(totalsRow);
      }

      if (pivotData.length > 0) {
        // Excel sheet names cannot exceed 31 characters
        const sheetName = t('products.ordersBySupplierMonthPivot');
        sheets.push({
          name: sheetName.length > 31 ? sheetName.substring(0, 31) : sheetName,
          data: pivotData,
        });
      }

      if (sheets.length === 0) {
        toast.error(t('products.noDataToExport'));
        return;
      }

      if (sheets.length === 0) {
        toast.error(t('products.noDataToExport'));
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      exportMultipleSheets(sheets, `pedidos_por_proveedor_mes_${timestamp}`);
      toast.success(t('products.ordersBySupplierMonthExported'));
    } catch (error: any) {
      console.error('Failed to export orders by supplier month:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || t('products.exportFailed');
      toast.error(errorMessage);
    }
  };

  const handleExportQuantityByReference = async () => {
    if (!isAdmin) {
      toast.error(t('common.unauthorized'));
      return;
    }

    try {
      // Fetch quantity by reference analytics
      const response = await api.get('/analytics/quantity-by-reference');
      if (!response.data.success) {
        toast.error(t('products.exportFailed'));
        return;
      }

      const data = response.data.data || [];
      if (data.length === 0) {
        toast.error(t('products.noDataToExport'));
        return;
      }

      const exportData = data.map((item: any) => ({
        [t('products.reference')]: item.reference || '-',
        [t('products.supplier')]: item.supplierName || '-',
        [t('orderDetail.totalQuantity')]: item.totalQuantity || 0,
        [t('dashboard.orderCount')]: item.orderCount || 0,
      }));

      const timestamp = new Date().toISOString().split('T')[0];
      // Excel sheet names cannot exceed 31 characters
      const sheetName = t('products.quantityByReference');
      exportToExcel(exportData, `cantidad_por_referencia_${timestamp}`, sheetName.length > 31 ? sheetName.substring(0, 31) : sheetName);
      toast.success(t('products.quantityByReferenceExported'));
    } catch (error: any) {
      console.error('Failed to export quantity by reference:', error);
      toast.error(error.response?.data?.error?.message || t('products.exportFailed'));
    }
  };

  // Sort products
  const sortedPendingProducts = [...pendingProducts].sort((a, b) => {
    if (sortBy === 'createdAt') {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortBy === 'productRef') {
      const refA = a.productRef.toLowerCase();
      const refB = b.productRef.toLowerCase();
      return sortOrder === 'asc' 
        ? refA.localeCompare(refB)
        : refB.localeCompare(refA);
    }
    return 0;
  });

  const filteredPendingProducts = sortedPendingProducts.filter((product) => {
    // Apply supplier filter
    if (selectedSupplierFilter && product.supplierId !== selectedSupplierFilter) {
      return false;
    }

    // Apply reference filter
    if (referenceFilter.trim() && !product.productRef.toLowerCase().includes(referenceFilter.toLowerCase())) {
      return false;
    }

    // Apply customer filter
    if (customerFilter && product.customerId !== customerFilter) {
      return false;
    }

    // Apply created by user filter
    if (createdByFilter && product.createdBy?.id !== createdByFilter) {
      return false;
    }

    // Apply order number filter
    if (orderNumberFilter.trim()) {
      if (!product.orderNumber) {
        return false; // If filter is set but product has no order number, exclude it
      }
      const orderNumStr = product.orderNumber.toString();
      if (!orderNumStr.includes(orderNumberFilter.trim())) {
        return false;
      }
    }

    // Apply date filter (using createdAt from pending product)
    if (dateFromFilter || dateToFilter) {
      if (!product.createdAt) {
        return false;
      }
      const productDate = new Date(product.createdAt);
      productDate.setHours(0, 0, 0, 0);

      if (dateFromFilter) {
        const fromDate = new Date(dateFromFilter);
        fromDate.setHours(0, 0, 0, 0);
        if (productDate < fromDate) {
          return false;
        }
      }

      if (dateToFilter) {
        const toDate = new Date(dateToFilter);
        toDate.setHours(23, 59, 59, 999);
        if (productDate > toDate) {
          return false;
        }
      }
    }

    // Apply search query filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.productRef.toLowerCase().includes(query) ||
      product.productDescription?.toLowerCase().includes(query) ||
      product.supplierName.toLowerCase().includes(query) ||
      product.customerName?.toLowerCase().includes(query) ||
      (product.orderNumber && product.orderNumber.toString().includes(query))
    );
  });

  // Removed toggleSection - filters are now always visible in compact layout

  const clearFilters = () => {
    setReferenceFilter('');
    setCustomerFilter('');
    setCreatedByFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setOrderNumberFilter('');
    setSelectedSupplierFilter('');
    setSearchQuery('');
  };

  const hasActiveFilters = referenceFilter || customerFilter || createdByFilter || dateFromFilter || dateToFilter || orderNumberFilter || selectedSupplierFilter;

  // Extract unique users from pending products for the filter dropdown
  const uniqueUsers = Array.from(
    new Map(
      pendingProducts
        .filter(p => p.createdBy?.id && p.createdBy?.username)
        .map(p => [p.createdBy!.id, { id: p.createdBy!.id, username: p.createdBy!.username }])
    ).values()
  ).sort((a, b) => a.username.localeCompare(b.username));

  const filteredProducts = products.filter((product) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.reference.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.supplier.name.toLowerCase().includes(query)
    );
  });

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const handleProductClick = (product: PendingProduct) => {
    navigate(`/orders/${product.orderId}`);
  };

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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{t('products.title')}</h1>
          <p className="page-subtitle">{t('products.pendingProducts')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isAdmin && (
            <>
            <button
              className="btn-secondary"
                onClick={handleExportOrdersBySupplierMonth}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                title={t('products.exportOrdersBySupplierMonth')}
            >
              <Download size={18} />
                {t('products.ordersBySupplierMonth')}
            </button>
              <button
                className="btn-secondary"
                onClick={handleExportQuantityByReference}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                title={t('products.exportQuantityByReference')}
              >
                <Download size={18} />
                {t('products.quantityByReference')}
            </button>
            </>
          )}
        </div>
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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {hasActiveFilters && (
            <button className="btn-secondary btn-sm" onClick={clearFilters}>
              <X size={16} />
              {t('common.clearFilters')}
            </button>
          )}
          <button
            className={`btn-secondary ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
          <Filter size={18} />
            {t('common.filters')}
          </button>
        </div>
      </div>

      {/* Compact Filters Panel */}
      {showFilters && (
        <div className="compact-filters-panel" style={{ 
          marginBottom: '1rem', 
          padding: '0.75rem 1rem', 
          backgroundColor: 'var(--bg-secondary)', 
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-primary)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('common.filters')}
            </h3>
            <button 
              className="btn-icon-small" 
              onClick={() => setShowFilters(false)} 
              title={t('common.close')}
              style={{ width: '24px', height: '24px', padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '0.75rem',
            alignItems: 'start'
          }}>
            {/* Reference Filter */}
            <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <FileText size={14} />
                {t('products.reference')}
              </label>
              <input
                type="text"
                placeholder={t('products.reference')}
                value={referenceFilter}
                onChange={(e) => setReferenceFilter(e.target.value)}
                className="filter-input"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', minHeight: '36px' }}
              />
            </div>

            {/* Customer Filter */}
            <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <User size={14} />
                {t('orders.customer')}
              </label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="filter-input"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', minHeight: '36px' }}
              >
                <option value="">{t('orders.allCustomers')}</option>
                {customersList.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier Filter */}
            <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Building2 size={14} />
                {t('products.supplier')}
              </label>
          <select
            value={selectedSupplierFilter}
            onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                className="filter-input"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', minHeight: '36px' }}
          >
            <option value="">{t('products.allSuppliers')}</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

            {/* Order Number Filter */}
            <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Hash size={14} />
                {t('orders.orderNumber')}
              </label>
              <input
                type="text"
                placeholder={t('orders.orderNumber')}
                value={orderNumberFilter}
                onChange={(e) => setOrderNumberFilter(e.target.value)}
                className="filter-input"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', minHeight: '36px' }}
              />
            </div>

            {/* Created By User Filter */}
            <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <User size={14} />
                {t('orders.createdBy')}
              </label>
              <select
                value={createdByFilter}
                onChange={(e) => setCreatedByFilter(e.target.value)}
                className="filter-input"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', minHeight: '36px' }}
              >
                <option value="">{t('orders.allUsers')}</option>
                {uniqueUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
      </div>

            {/* Date Filters */}
            <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Calendar size={14} />
                {t('orders.dateFilters')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="filter-input"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', minHeight: '36px' }}
                />
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="filter-input"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', minHeight: '36px' }}
                  min={dateFromFilter || undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show pending products for ALL users */}
      {filteredPendingProducts.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p>{t('products.noPendingProducts')}</p>
        </div>
      ) : (
        <div className="products-list-container">
          <table className="products-table">
            <thead>
              <tr>
                <th 
                  className={sortBy === 'productRef' ? 'sortable-header active' : 'sortable-header'}
                  onClick={() => handleSort('productRef')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t('products.reference')}
                    {getSortIcon('productRef')}
                  </div>
                </th>
                <th>{t('products.supplier')}</th>
                <th 
                  className={sortBy === 'createdAt' ? 'sortable-header active' : 'sortable-header'}
                  onClick={() => handleSort('createdAt')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t('orders.createdAt')}
                    {getSortIcon('createdAt')}
                  </div>
                </th>
                <th>{t('orders.createdBy')}</th>
                <th>{t('orders.customerPhone')}</th>
                <th>{t('orders.customer')}</th>
                <th>{t('orders.orderNumber')}</th>
                <th>{t('orderDetail.quantity')}</th>
                <th>{t('orderDetail.receivedQuantity')}</th>
                <th>{t('products.pendingQuantity')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPendingProducts.map((product) => {
                const isCancelled = product.orderStatus === 'CANCELLED';
                return (
                <tr
                  key={product.id}
                  className={`product-row ${isCancelled ? 'product-row-cancelled' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleProductClick(product)}
                >
                  <td>
                    <div className="product-reference">{product.productRef}</div>
                  </td>
                  <td>
                    <div className="product-supplier">{product.supplierName}</div>
                  </td>
                  <td>
                    <div className="product-created-date">
                      {product.createdAt ? formatDateTime(product.createdAt) : '-'}
                    </div>
                  </td>
                  <td>
                    <div className="product-created-by">
                      {product.createdBy?.username || '-'}
                    </div>
                  </td>
                  <td>
                    <div className="product-customer-phone">
                      {product.customerPhone || '-'}
                    </div>
                  </td>
                  <td>
                    <div className="product-customer">
                      {product.customerName || '-'}
                    </div>
                  </td>
                  <td>
                    <div className="product-order-number">
                      {product.orderNumber || '-'}
                    </div>
                  </td>
                  <td>
                    <div className="product-quantity">
                      {product.quantity}
                    </div>
                  </td>
                  <td>
                    <div className="qty-badge qty-badge-received">
                      {product.receivedQuantity || '0'}
                    </div>
                  </td>
                  <td>
                    <div className="qty-badge qty-badge-pending">
                      {product.pendingQuantity}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
