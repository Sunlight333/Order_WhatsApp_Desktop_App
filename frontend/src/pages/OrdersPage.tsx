import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, Filter, Loader2, X, ChevronLeft, ChevronRight, MessageSquare, Eye, Copy, ArrowUp, ArrowDown, ChevronUp, ChevronDown, BarChart3, ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon, User, Building2, Coins, Hash, FileText, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useDebounce } from '../hooks/useDebounce';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import { getWhatsAppMessage, openWhatsApp } from '../utils/whatsapp';
import WhatsAppModal from '../components/WhatsAppModal';
import { useAuthStore } from '../store/authStore';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useOrderStatusConfig, getStatusConfig } from '../hooks/useOrderStatusConfig';
import { exportMultipleSheets } from '../utils/excelExport';

interface Order {
  id: string;
  orderNumber?: number; // Auto-incremental order number (1, 2, 3...)
  customerName?: string;
  customerId?: string;
  customerPhone?: string;
  countryCode?: string;
  status: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
  suppliers: Array<{ id: string; name: string }>;
  totalAmount?: string;
  createdBy?: {
    id: string;
    username: string;
  } | null;
  customer?: {
    id: string;
    name: string;
    phone?: string;
    countryCode?: string;
  } | null;
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [updatedDateFrom, setUpdatedDateFrom] = useState<string>('');
  const [updatedDateTo, setUpdatedDateTo] = useState<string>('');
  const [notifiedDateFrom, setNotifiedDateFrom] = useState<string>('');
  const [notifiedDateTo, setNotifiedDateTo] = useState<string>('');
  const [urlParamsRead, setUrlParamsRead] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [createdByFilter, setCreatedByFilter] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [minOrderNumber, setMinOrderNumber] = useState<string>('');
  const [maxOrderNumber, setMaxOrderNumber] = useState<string>('');
  const [hasObservations, setHasObservations] = useState<string>('');
  const [productReferenceFilter, setProductReferenceFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dates: true,
    status: true,
    entities: false,
    amounts: false,
    advanced: false,
  });
  
  // Filter data caches
  const [suppliersList, setSuppliersList] = useState<Array<{ id: string; name: string }>>([]);
  const [customersList, setCustomersList] = useState<Array<{ id: string; name: string }>>([]);
  const [usersList, setUsersList] = useState<Array<{ id: string; username: string }>>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'orders' | 'supplier-analytics'>('orders');
  const [supplierAnalyticsYear, setSupplierAnalyticsYear] = useState<number>(new Date().getFullYear());
  const [supplierAnalyticsMonth, setSupplierAnalyticsMonth] = useState<number | null>(null); // null = all months (default)
  const [supplierAnalyticsChartType, setSupplierAnalyticsChartType] = useState<'amount' | 'count'>('count'); // Default: Order Count by Month
  const [supplierAnalyticsView, setSupplierAnalyticsView] = useState<'chart' | 'table' | 'both'>('both'); // Default: both chart and table
  const [supplierAnalyticsTableFilter, setSupplierAnalyticsTableFilter] = useState<string>(''); // Filter by supplier name
  const [supplierAnalyticsLoading, setSupplierAnalyticsLoading] = useState(false);
  const [supplierAnalyticsData, setSupplierAnalyticsData] = useState<any[]>([]);

  // Increased debounce time to 2000ms (2 seconds) to give users more time to type
  const debouncedSearch = useDebounce(searchQuery, 2000);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const { config: statusConfig } = useOrderStatusConfig();

  const handleExportSupplierAnalytics = async () => {
    if (!isAdmin) {
      toast.error(t('common.unauthorized'));
      return;
    }

    try {
      if (!supplierAnalyticsData || supplierAnalyticsData.length === 0) {
        toast.error(t('orders.noSupplierAnalyticsToExport'));
        return;
      }

      const monthNames = [
        t('orders.january'), t('orders.february'), t('orders.march'), t('orders.april'),
        t('orders.may'), t('orders.june'), t('orders.july'), t('orders.august'),
        t('orders.september'), t('orders.october'), t('orders.november'), t('orders.december'),
      ];

      const filteredSupplierAnalyticsData = supplierAnalyticsData.filter(
        (supplier) =>
          !supplierAnalyticsTableFilter ||
          supplier.supplierName.toLowerCase().includes(supplierAnalyticsTableFilter.toLowerCase())
      );

      if (filteredSupplierAnalyticsData.length === 0) {
        toast.error(t('orders.noSupplierAnalyticsToExport'));
        return;
      }

      const sheets: Array<{ name: string; data: any[] }> = [];

      // Sheet 1: Supplier Analytics table data (same as UI)
      let supplierExportData: any[] = [];
      if (supplierAnalyticsMonth !== null) {
        const tableData: Array<{
          supplierName: string;
          month: string;
          totalAmount: number;
          orderCount: number;
        }> = [];

        filteredSupplierAnalyticsData.forEach((supplier) => {
          (supplier.monthlyData || []).forEach((monthData: { month: string; totalAmount: number; orderCount: number }) => {
            tableData.push({
              supplierName: supplier.supplierName,
              month: monthData.month,
              totalAmount: Number(monthData.totalAmount || 0),
              orderCount: Number(monthData.orderCount || 0),
            });
          });
        });

        tableData.sort((a, b) => (a.month !== b.month ? a.month.localeCompare(b.month) : a.supplierName.localeCompare(b.supplierName)));

        supplierExportData = tableData.map((row) => ({
          [t('orders.supplier')]: row.supplierName,
          [t('orders.month')]: row.month,
          [t('orders.totalAmount')]: `${row.totalAmount.toFixed(2)} €`,
          [t('orders.orderCount')]: row.orderCount,
        }));
      } else {
        const aggregatedData = new Map<string, { totalAmount: number; orderCount: number }>();

        filteredSupplierAnalyticsData.forEach((supplier) => {
          let totalAmount = 0;
          let totalOrderCount = 0;
          (supplier.monthlyData || []).forEach((monthData: { totalAmount: number; orderCount: number }) => {
            totalAmount += Number(monthData.totalAmount || 0);
            totalOrderCount += Number(monthData.orderCount || 0);
          });
          aggregatedData.set(supplier.supplierName, { totalAmount, orderCount: totalOrderCount });
        });

        const tableData = Array.from(aggregatedData.entries())
          .map(([supplierName, data]) => ({ supplierName, ...data }))
          .sort((a, b) => a.supplierName.localeCompare(b.supplierName));

        supplierExportData = tableData.map((row) => ({
          [t('orders.supplier')]: row.supplierName,
          [t('orders.totalAmount')]: `${row.totalAmount.toFixed(2)} €`,
          [t('orders.orderCount')]: row.orderCount,
        }));
      }

      if (supplierExportData.length > 0) {
        sheets.push({ name: t('orders.supplierAnalytics'), data: supplierExportData });
      }

      // Sheet 2: Pivot table (Month x Supplier) - Order Count
      try {
        const supplierNames = filteredSupplierAnalyticsData.map((s) => s.supplierName).sort((a, b) => a.localeCompare(b));

        const months =
          supplierAnalyticsMonth !== null
            ? [`${supplierAnalyticsYear}-${String(supplierAnalyticsMonth).padStart(2, '0')}`]
            : Array.from({ length: 12 }, (_, i) => `${supplierAnalyticsYear}-${String(i + 1).padStart(2, '0')}`);

        // Build lookup: supplier -> (month -> orderCount)
        const lookup = new Map<string, Map<string, number>>();
        filteredSupplierAnalyticsData.forEach((s) => {
          const m = new Map<string, number>();
          (s.monthlyData || []).forEach((md: { month: string; orderCount: number }) => {
            if (md?.month) m.set(md.month, Number(md.orderCount || 0));
          });
          lookup.set(s.supplierName, m);
        });

        const supplierTotals = new Map<string, number>();
        supplierNames.forEach((n) => supplierTotals.set(n, 0));

        const pivotRows: any[] = [];
        let grandTotal = 0;

        for (const month of months) {
          let rowTotal = 0;
          const row: Record<string, any> = {};

          row[t('orders.monthSupplier')] = month;

          for (const supplierName of supplierNames) {
            const v = lookup.get(supplierName)?.get(month) ?? 0;
            row[supplierName] = v;
            rowTotal += v;
            supplierTotals.set(supplierName, (supplierTotals.get(supplierName) || 0) + v);
          }

          row[t('orders.supplierTotal')] = rowTotal;
          grandTotal += rowTotal;
          pivotRows.push(row);
        }

        if (pivotRows.length > 0) {
          const totalsRow: Record<string, any> = {};
          totalsRow[t('orders.monthSupplier')] = t('orders.monthTotal');
          for (const supplierName of supplierNames) {
            totalsRow[supplierName] = supplierTotals.get(supplierName) || 0;
          }
          totalsRow[t('orders.supplierTotal')] = grandTotal;
          pivotRows.push(totalsRow);

          sheets.push({ name: t('orders.supplierMonthlyPivot'), data: pivotRows });
        }
      } catch (error) {
        console.warn('Failed to build supplier monthly pivot export:', error);
      }

      // Fetch and add orders by month sheet
      try {
        const ordersByMonthRes = await api.get('/analytics/orders-by-month');
        if (ordersByMonthRes.data?.success) {
          const ordersData = ordersByMonthRes.data.data || [];
          if (ordersData.length > 0) {
            sheets.push({
              name: t('dashboard.ordersByMonth'),
              data: ordersData.map((item: any) => ({
                [t('dashboard.month')]: item.monthName || item.month,
                [t('dashboard.orderCount')]: item.count,
              })),
            });
          } else {
            // Add empty sheet with headers
            sheets.push({
              name: t('dashboard.ordersByMonth'),
              data: [{
                [t('dashboard.month')]: '',
                [t('dashboard.orderCount')]: '',
              }],
            });
          }
        }
      } catch (error: any) {
        // Still add empty sheet so user knows it was attempted
        sheets.push({
          name: t('dashboard.ordersByMonth'),
          data: [{
            [t('dashboard.month')]: '',
            [t('dashboard.orderCount')]: '',
          }],
        });
      }

      // Fetch and add quantity by reference sheet
      try {
        const quantityByRefRes = await api.get('/analytics/quantity-by-reference');
        if (quantityByRefRes.data?.success) {
          const quantityData = quantityByRefRes.data.data || [];
          if (quantityData.length > 0) {
            sheets.push({
              name: t('dashboard.quantityByReference'),
              data: quantityData.map((item: any) => ({
                [t('products.reference')]: item.reference,
                [t('products.supplier')]: item.supplierName,
                [t('dashboard.totalQuantity')]: item.totalQuantity,
                [t('dashboard.orderCount')]: item.orderCount,
              })),
            });
          } else {
            // Add empty sheet with headers
            sheets.push({
              name: t('dashboard.quantityByReference'),
              data: [{
                [t('products.reference')]: '',
                [t('products.supplier')]: '',
                [t('dashboard.totalQuantity')]: '',
                [t('dashboard.orderCount')]: '',
              }],
            });
          }
        }
      } catch (error: any) {
        // Still add empty sheet so user knows it was attempted
        sheets.push({
          name: t('dashboard.quantityByReference'),
          data: [{
            [t('products.reference')]: '',
            [t('products.supplier')]: '',
            [t('dashboard.totalQuantity')]: '',
            [t('dashboard.orderCount')]: '',
          }],
        });
      }

      if (sheets.length === 0) {
        toast.error(t('orders.noSupplierAnalyticsToExport'));
        return;
      }

      const monthStr = supplierAnalyticsMonth !== null ? `_${monthNames[supplierAnalyticsMonth - 1]}` : '';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `analiticas_proveedores_${supplierAnalyticsYear}${monthStr}_${timestamp}`;

      exportMultipleSheets(sheets, filename);
      toast.success(t('orders.supplierAnalyticsExported'));
    } catch (error: any) {
      console.error('Failed to export supplier analytics:', error);
      toast.error(error.response?.data?.error?.message || t('orders.exportFailed'));
    }
  };

  // Read URL query params on mount and when they change
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const statuses = statusParam ? statusParam.split(',').filter(s => s.trim()) : [];
    setStatusFilter(statuses);

    const dateFromParam = searchParams.get('dateFrom') || '';
    setDateFrom(dateFromParam);

    const dateToParam = searchParams.get('dateTo') || '';
    setDateTo(dateToParam);

    const notifiedDateFromParam = searchParams.get('notifiedDateFrom') || '';
    setNotifiedDateFrom(notifiedDateFromParam);

    const notifiedDateToParam = searchParams.get('notifiedDateTo') || '';
    setNotifiedDateTo(notifiedDateToParam);

    // IMPORTANT UX: do NOT auto-open the filters panel just because URL params exist.
    // If some flows want to open it programmatically, they can pass ?openFilters=1.
    const shouldOpenFilters =
      searchParams.get('openFilters') === '1' || searchParams.get('openFilters') === 'true';

    if (shouldOpenFilters) {
      setShowFilters(true);
      setExpandedSections(prev => ({
        ...prev,
        status: true,
        dates: true,
      }));
    }

    // Reset to first page when filters change from URL
    setPage(1);
    
    // Mark that URL params have been read
    setUrlParamsRead(true);
  }, [searchParams]);

  // Load filter data when filters panel opens
  useEffect(() => {
    if (showFilters && (suppliersList.length === 0 || customersList.length === 0 || usersList.length === 0)) {
      loadFilterData();
    }
  }, [showFilters]);

  useEffect(() => {
    // Only fetch orders after URL params have been read (to avoid fetching with empty filters when navigating from dashboard)
    if (urlParamsRead) {
      fetchOrders();
    }
  }, [debouncedSearch, statusFilter, dateFrom, dateTo, updatedDateFrom, updatedDateTo, notifiedDateFrom, notifiedDateTo, supplierFilter, customerFilter, createdByFilter, minAmount, maxAmount, minOrderNumber, maxOrderNumber, hasObservations, productReferenceFilter, page, sortBy, sortOrder, urlParamsRead]);

  // Fetch supplier analytics when tab, year, or month changes
  useEffect(() => {
    if (isAdmin && activeTab === 'supplier-analytics') {
      fetchSupplierAnalytics();
    }
  }, [isAdmin, activeTab, supplierAnalyticsYear, supplierAnalyticsMonth]);

  const fetchSupplierAnalytics = async () => {
    if (!isAdmin) return;
    
    try {
      setSupplierAnalyticsLoading(true);
      const params: any = {
        year: supplierAnalyticsYear,
      };
      
      if (supplierAnalyticsMonth !== null) {
        params.month = supplierAnalyticsMonth;
      }
      
      const response = await api.get<{ success: true; data: any[] }>('/analytics/supplier-monthly', { params });
      setSupplierAnalyticsData(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch supplier analytics:', error);
      toast.error(error.response?.data?.error?.message || t('orders.supplierAnalyticsError'));
      setSupplierAnalyticsData([]);
    } finally {
      setSupplierAnalyticsLoading(false);
    }
  };

  const loadFilterData = async () => {
    try {
      setLoadingFilters(true);
      const [suppliersRes, customersRes, usersRes] = await Promise.all([
        api.get<{ success: true; data: Array<{ id: string; name: string }> }>('/suppliers').catch(() => ({ data: { success: true, data: [] } })),
        api.get<{ success: true; data: Array<{ id: string; name: string }> }>('/customers/search').catch(() => ({ data: { success: true, data: [] } })),
        api.get<{ success: true; data: Array<{ id: string; username: string }> }>('/users').catch(() => ({ data: { success: true, data: [] } })),
      ]);
      
      if (suppliersRes.data.success) setSuppliersList(suppliersRes.data.data || []);
      if (customersRes.data.success) setCustomersList(customersRes.data.data || []);
      if (usersRes.data.success) setUsersList(usersRes.data.data || []);
    } catch (error) {
      console.error('Failed to load filter data:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  const fetchOrders = async (useImmediateSearch: boolean = false) => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 50,
      };

      // Use searchQuery directly for immediate search (Enter key or button click)
      // Otherwise use debouncedSearch for automatic search while typing
      const searchValue = useImmediateSearch ? searchQuery : debouncedSearch;
      if (searchValue.trim()) {
        params.search = searchValue.trim();
      }

      if (statusFilter.length > 0) {
        params.status = statusFilter.join(',');
      }

      if (dateFrom) {
        params.dateFrom = dateFrom;
      }

      if (dateTo) {
        params.dateTo = dateTo;
      }

      if (updatedDateFrom) {
        params.updatedDateFrom = updatedDateFrom;
      }

      if (updatedDateTo) {
        params.updatedDateTo = updatedDateTo;
      }

      if (notifiedDateFrom) {
        params.notifiedDateFrom = notifiedDateFrom;
      }

      if (notifiedDateTo) {
        params.notifiedDateTo = notifiedDateTo;
      }

      if (supplierFilter.length > 0) {
        params.supplierIds = supplierFilter.join(',');
      }

      if (customerFilter) {
        params.customerId = customerFilter;
      }

      if (createdByFilter) {
        params.createdById = createdByFilter;
      }

      if (minAmount) {
        params.minAmount = minAmount;
      }

      if (maxAmount) {
        params.maxAmount = maxAmount;
      }

      if (minOrderNumber) {
        params.minOrderNumber = minOrderNumber;
      }

      if (maxOrderNumber) {
        params.maxOrderNumber = maxOrderNumber;
      }

      if (hasObservations) {
        params.hasObservations = hasObservations;
      }

      if (productReferenceFilter.trim()) {
        params.productReference = productReferenceFilter.trim();
      }

      if (sortBy) {
        params.sortBy = sortBy;
      }

      if (sortOrder) {
        params.sortOrder = sortOrder;
      }

      const response = await api.get<{
        success: true;
        data: {
          orders: Order[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
        };
      }>('/orders', { 
        params,
        signal: abortController.signal 
      });
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setOrders(response.data.data.orders || []);
        setPagination(response.data.data.pagination);
      }
    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name === 'AbortError' || abortController.signal.aborted || error.code === 'ERR_CANCELED' || error.message === 'canceled') {
        return;
      }
      toast.error(error.response?.data?.error?.message || t('orders.loadFailed'));
    } finally {
      // Only set loading to false if this is still the current request (not aborted and still the active one)
      if (abortControllerRef.current === abortController && !abortController.signal.aborted) {
        setLoading(false);
        abortControllerRef.current = null;
      } else if (abortController.signal.aborted) {
        // If this request was aborted, only set loading to false if there's no new request pending
        if (abortControllerRef.current === null || abortControllerRef.current === abortController) {
          setLoading(false);
        }
      }
    }
  };

  const getStatusColor = (status: string) => {
    // Use custom config if available, otherwise fallback to default
    const config = getStatusConfig(status, statusConfig);
    // Return a class name that will be styled with inline styles
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

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        // Remove status if already selected
        return prev.filter(s => s !== status);
      } else {
        // Add status if not selected
        return [...prev, status];
      }
    });
    setPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle manual search trigger (Enter key or search button click)
  const handleManualSearch = () => {
    setPage(1); // Reset to first page on new search
    fetchOrders(true); // Use immediate search with current searchQuery (bypasses debounce)
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter([]);
    setDateFrom('');
    setDateTo('');
    setUpdatedDateFrom('');
    setUpdatedDateTo('');
    setNotifiedDateFrom('');
    setNotifiedDateTo('');
    setSupplierFilter([]);
    setCustomerFilter('');
    setCreatedByFilter('');
    setMinAmount('');
    setMaxAmount('');
    setMinOrderNumber('');
    setMaxOrderNumber('');
    setHasObservations('');
    setProductReferenceFilter('');
    setPage(1);
    // Clear URL params
    setSearchParams({});
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
    setPage(1); // Reset to first page when sorting changes
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ChevronUp size={14} style={{ opacity: 0.3 }} />;
    }
    return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  // Format date as DD/MM/YYYY
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const hasActiveFilters = useMemo(() => {
    return !!(
      searchQuery.trim() ||
      statusFilter.length > 0 ||
      dateFrom ||
      dateTo ||
      updatedDateFrom ||
      updatedDateTo ||
      notifiedDateFrom ||
      notifiedDateTo ||
      supplierFilter.length > 0 ||
      customerFilter ||
      createdByFilter ||
      minAmount ||
      maxAmount ||
      minOrderNumber ||
      maxOrderNumber ||
      hasObservations ||
      productReferenceFilter.trim()
    );
  }, [searchQuery, statusFilter, dateFrom, dateTo, updatedDateFrom, updatedDateTo, notifiedDateFrom, notifiedDateTo, supplierFilter, customerFilter, createdByFilter, minAmount, maxAmount, minOrderNumber, maxOrderNumber, hasObservations, productReferenceFilter]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const applyDatePreset = (preset: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    switch (preset) {
      case 'today':
        setDateFrom(today.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case 'thisWeek':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        setDateFrom(weekStart.toISOString().split('T')[0]);
        setDateTo(endOfDay.toISOString().split('T')[0]);
        break;
      case 'thisMonth':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateFrom(monthStart.toISOString().split('T')[0]);
        setDateTo(endOfDay.toISOString().split('T')[0]);
        break;
      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setDateFrom(lastMonthStart.toISOString().split('T')[0]);
        setDateTo(lastMonthEnd.toISOString().split('T')[0]);
        break;
      case 'last7Days':
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);
        setDateFrom(last7Days.toISOString().split('T')[0]);
        setDateTo(endOfDay.toISOString().split('T')[0]);
        break;
      case 'last30Days':
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);
        setDateFrom(last30Days.toISOString().split('T')[0]);
        setDateTo(endOfDay.toISOString().split('T')[0]);
        break;
      case 'last90Days':
        const last90Days = new Date(today);
        last90Days.setDate(today.getDate() - 90);
        setDateFrom(last90Days.toISOString().split('T')[0]);
        setDateTo(endOfDay.toISOString().split('T')[0]);
        break;
    }
    setPage(1);
  };

  const handleRowRightClick = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedOrder(order);
    showContextMenu(e, order);
  };

  const handleWhatsAppAction = async (order?: Order) => {
    const targetOrder = order || selectedOrder;
    if (!targetOrder) return;
    
    try {
      setSelectedOrder(targetOrder);
      const message = await getWhatsAppMessage();
      setWhatsappMessage(message);
      setShowWhatsAppModal(true);
    } catch (error: any) {
      toast.error(t('whatsapp.messageFailed'));
    }
  };

  const handlePhoneClick = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();
    handleWhatsAppAction(order);
  };

  const confirmWhatsAppSend = async (message: string) => {
    if (!selectedOrder) return;
    setShowWhatsAppModal(false);

    try {
      const phone = selectedOrder.customerPhone || selectedOrder.customer?.phone;
      if (!phone) {
        toast.error(t('orders.noPhoneNumber'));
        return;
      }
      const countryCode = selectedOrder.countryCode || selectedOrder.customer?.countryCode || '+34';
      const fullPhone = `${countryCode}${phone}`;
      await openWhatsApp(fullPhone, message);
      
      // Update status after a delay
      setTimeout(async () => {
        try {
          await api.patch(`/orders/${selectedOrder.id}/status`, {
            status: 'NOTIFIED_WHATSAPP',
            notificationMethod: 'WHATSAPP',
          });
          toast.success(t('orderDetail.statusUpdatedWhatsApp'));
          fetchOrders(); // Refresh orders
        } catch (error: any) {
          console.error('Failed to update status:', error);
        }
      }, 2000);
    } catch (error: any) {
      toast.error(t('whatsapp.messageFailed'));
    }
  };

  const handleCopyOrderId = () => {
    if (!selectedOrder) return;
    // Copy orderNumber if it exists, otherwise copy the original order ID
    const orderNumber = selectedOrder.orderNumber?.toString() || selectedOrder.id;
    const textToCopy = t('orders.copyOrderNumberText', { orderNumber });
    navigator.clipboard.writeText(textToCopy);
    toast.success(textToCopy, { duration: 3000 });
  };

  const handleCopyPhone = () => {
    if (!selectedOrder) return;
    const phone = selectedOrder.customerPhone || selectedOrder.customer?.phone;
    if (!phone) {
      toast.error(t('orders.noPhoneNumber'));
      return;
    }
    const countryCode = selectedOrder.countryCode || selectedOrder.customer?.countryCode || '+34';
    const fullPhone = `${countryCode}${phone}`;
    navigator.clipboard.writeText(fullPhone);
    toast.success(t('common.copied'));
  };

  const getContextMenuItems = (order: Order): ContextMenuItem[] => {
    return [
      {
        label: t('orders.viewDetails'),
        icon: <Eye size={16} />,
        action: () => navigate(`/orders/${order.id}`),
      },
      {
        label: t('orders.sendWhatsAppMessage'),
        icon: <MessageSquare size={16} />,
        action: handleWhatsAppAction,
      },
      { divider: true },
      {
        label: t('orders.copyOrderNumber'),
        icon: <Copy size={16} />,
        action: handleCopyOrderId,
      },
      {
        label: t('orders.copyPhoneNumber'),
        icon: <Copy size={16} />,
        action: handleCopyPhone,
      },
    ];
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{t('orders.title')}</h1>
          <p className="page-subtitle">{t('orders.manageOrders')}</p>
        </div>
        {activeTab === 'orders' && (
          <button
            className="btn-primary"
            onClick={() => navigate('/orders/create')}
          >
            <Plus size={20} />
            {t('orders.createOrder')}
          </button>
        )}
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)' }}>
          <button
            className={`btn-secondary ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
            style={{
              borderBottom: activeTab === 'orders' ? '2px solid var(--primary-color)' : '2px solid transparent',
              borderRadius: 0,
              marginBottom: '-2px',
              padding: '0.75rem 1.5rem',
            }}
          >
            {t('orders.ordersList')}
          </button>
          <button
            className={`btn-secondary ${activeTab === 'supplier-analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('supplier-analytics')}
            style={{
              borderBottom: activeTab === 'supplier-analytics' ? '2px solid var(--primary-color)' : '2px solid transparent',
              borderRadius: 0,
              marginBottom: '-2px',
              padding: '0.75rem 1.5rem',
            }}
          >
            <BarChart3 size={18} style={{ marginRight: '0.5rem' }} />
            {t('orders.supplierAnalytics')}
          </button>
        </div>
      )}

      {/* Orders Tab Content */}
      {activeTab === 'orders' && (
        <>
          <div className="orders-toolbar">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder={t('orders.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleManualSearch();
              }
            }}
            className="search-input"
          />
          <button
            className="search-button"
            onClick={handleManualSearch}
            title={t('common.search') || 'Search'}
          >
            <Search size={18} />
          </button>
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
        <div className="toolbar-actions">
          {hasActiveFilters && (
            <button className="btn-secondary btn-sm" onClick={clearFilters}>
              <X size={16} />
              {t('common.clearFilters')}
            </button>
          )}
          <button
            className={`btn-secondary ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            {t('common.filter')}
          </button>
        </div>
      </div>

      {/* Modern Filter Panel */}
      {showFilters && (
        <div className="modern-filter-panel">
          <div className="filter-header">
            <h3>{t('common.filters')}</h3>
            <button className="btn-icon-small" onClick={() => setShowFilters(false)} title={t('common.close')}>
              <X size={16} />
            </button>
          </div>

          <div className="filter-content">
            {/* Quick Date Presets */}
            <div className="filter-section">
              <button 
                className="filter-section-header"
                onClick={() => toggleSection('dates')}
              >
                <FileText size={18} />
                <span>{t('orders.dateFilters')}</span>
                {expandedSections.dates ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
              </button>
              {expandedSections.dates && (
                <div className="filter-section-content">
                  <div className="date-presets">
                    <button className="preset-btn" onClick={() => applyDatePreset('today')}>{t('orders.today')}</button>
                    <button className="preset-btn" onClick={() => applyDatePreset('thisWeek')}>{t('orders.thisWeek')}</button>
                    <button className="preset-btn" onClick={() => applyDatePreset('thisMonth')}>{t('orders.thisMonth')}</button>
                    <button className="preset-btn" onClick={() => applyDatePreset('lastMonth')}>{t('orders.lastMonth')}</button>
                    <button className="preset-btn" onClick={() => applyDatePreset('last7Days')}>{t('orders.last7Days')}</button>
                    <button className="preset-btn" onClick={() => applyDatePreset('last30Days')}>{t('orders.last30Days')}</button>
                    <button className="preset-btn" onClick={() => applyDatePreset('last90Days')}>{t('orders.last90Days')}</button>
                  </div>
                  
                  {/* Date Groups in a Row */}
                  <div className="date-groups-row">
                    {/* Created Date Group */}
                    <div className="date-filter-group">
                      <div className="date-group-header">
                        <span className="date-group-title">{t('orders.createdAt')}</span>
                      </div>
                      <div className="filter-row filter-row-2">
                        <div className="filter-group">
                          <label>{t('orders.createdDateFrom')}</label>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            className="filter-input"
                          />
                        </div>
                        <div className="filter-group">
                          <label>{t('orders.createdDateTo')}</label>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            className="filter-input"
                            min={dateFrom || undefined}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Updated Date Group */}
                    <div className="date-filter-group">
                      <div className="date-group-header">
                        <span className="date-group-title">{t('orders.updatedAt')}</span>
                      </div>
                      <div className="filter-row filter-row-2">
                        <div className="filter-group">
                          <label>{t('orders.updatedDateFrom')}</label>
                          <input
                            type="date"
                            value={updatedDateFrom}
                            onChange={(e) => { setUpdatedDateFrom(e.target.value); setPage(1); }}
                            className="filter-input"
                          />
                        </div>
                        <div className="filter-group">
                          <label>{t('orders.updatedDateTo')}</label>
                          <input
                            type="date"
                            value={updatedDateTo}
                            onChange={(e) => { setUpdatedDateTo(e.target.value); setPage(1); }}
                            className="filter-input"
                            min={updatedDateFrom || undefined}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notified Date Group */}
                    <div className="date-filter-group">
                      <div className="date-group-header">
                        <span className="date-group-title">{t('orders.notifiedAt')}</span>
                      </div>
                      <div className="filter-row filter-row-2">
                        <div className="filter-group">
                          <label>{t('orders.notifiedDateFrom')}</label>
                          <input
                            type="date"
                            value={notifiedDateFrom}
                            onChange={(e) => { setNotifiedDateFrom(e.target.value); setPage(1); }}
                            className="filter-input"
                          />
                        </div>
                        <div className="filter-group">
                          <label>{t('orders.notifiedDateTo')}</label>
                          <input
                            type="date"
                            value={notifiedDateTo}
                            onChange={(e) => { setNotifiedDateTo(e.target.value); setPage(1); }}
                            className="filter-input"
                            min={notifiedDateFrom || undefined}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="filter-section">
              <button 
                className="filter-section-header"
                onClick={() => toggleSection('status')}
              >
                <Filter size={18} />
                <span>{t('common.status')}</span>
                {expandedSections.status ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
              </button>
              {expandedSections.status && (
                <div className="filter-section-content">
                  <div className="checkbox-grid">
                    {[
                      { value: 'PENDING', label: t('orders.statusPending') },
                      { value: 'RECEIVED', label: t('orders.statusReceived') },
                      { value: 'NOTIFIED_CALL', label: t('orders.statusNotifiedCall') },
                      { value: 'NOTIFIED_WHATSAPP', label: t('orders.statusNotifiedWhatsApp') },
                      { value: 'DELIVERED_COUNTER', label: t('orders.statusDeliveredCounter') },
                      { value: 'CANCELLED', label: t('orders.statusCancelled') },
                      { value: 'INCOMPLETO', label: t('orders.statusIncompleto') },
                    ].map((statusOption) => (
                      <label key={statusOption.value} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={statusFilter.includes(statusOption.value)}
                          onChange={() => handleStatusFilterChange(statusOption.value)}
                        />
                        <span>{statusOption.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Entities Filter (Suppliers, Customers, Users) */}
            <div className="filter-section" data-section="entities">
              <button 
                className="filter-section-header"
                onClick={() => toggleSection('entities')}
              >
                <Building2 size={18} />
                <span>{t('orders.entities')}</span>
                {expandedSections.entities ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
              </button>
              {expandedSections.entities && (
                <div className="filter-section-content">
                  <div className="filter-group" style={{ gridColumn: '1 / -1' }}>
                    <label>{t('orders.suppliers')}</label>
                    {loadingFilters ? (
                      <Loader2 className="spinner" size={16} />
                    ) : (
                      <div className="suppliers-checkbox-row">
                        {suppliersList.map((supplier) => (
                          <label key={supplier.id} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={supplierFilter.includes(supplier.id)}
                              onChange={() => {
                                setSupplierFilter(prev => 
                                  prev.includes(supplier.id)
                                    ? prev.filter(id => id !== supplier.id)
                                    : [...prev, supplier.id]
                                );
                                setPage(1);
                              }}
                            />
                            <span>{supplier.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="filter-group">
                    <label>{t('orders.customer')}</label>
                    <select
                      value={customerFilter}
                      onChange={(e) => { setCustomerFilter(e.target.value); setPage(1); }}
                      className="filter-input"
                    >
                      <option value="">{t('orders.allCustomers')}</option>
                      {customersList.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>{t('orders.createdBy')}</label>
                    <select
                      value={createdByFilter}
                      onChange={(e) => { setCreatedByFilter(e.target.value); setPage(1); }}
                      className="filter-input"
                    >
                      <option value="">{t('orders.allUsers')}</option>
                      {usersList.map((user) => (
                        <option key={user.id} value={user.id}>{user.username}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Amount & Order Number Range */}
            <div className="filter-section">
              <button 
                className="filter-section-header"
                onClick={() => toggleSection('amounts')}
              >
                <Coins size={18} />
                <span>{t('orders.amountsAndNumbers')}</span>
                {expandedSections.amounts ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
              </button>
              {expandedSections.amounts && (
                <div className="filter-section-content">
                  <div className="filter-row filter-row-4">
                    <div className="filter-group">
                      <label>{t('orders.minAmount')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={minAmount}
                        onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                        className="filter-input"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="filter-group">
                      <label>{t('orders.maxAmount')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={maxAmount}
                        onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                        className="filter-input"
                        placeholder="999999.99"
                      />
                    </div>
                    <div className="filter-group">
                      <label>{t('orders.minOrderNumber')}</label>
                      <input
                        type="number"
                        value={minOrderNumber}
                        onChange={(e) => { setMinOrderNumber(e.target.value); setPage(1); }}
                        className="filter-input"
                        placeholder="1"
                      />
                    </div>
                    <div className="filter-group">
                      <label>{t('orders.maxOrderNumber')}</label>
                      <input
                        type="number"
                        value={maxOrderNumber}
                        onChange={(e) => { setMaxOrderNumber(e.target.value); setPage(1); }}
                        className="filter-input"
                        placeholder="999999"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Filters */}
            <div className="filter-section" data-section="advanced">
              <button 
                className="filter-section-header"
                onClick={() => toggleSection('advanced')}
              >
                <FileText size={18} />
                <span>{t('orders.advanced')}</span>
                {expandedSections.advanced ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
              </button>
              {expandedSections.advanced && (
                <div className="filter-section-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div className="filter-group">
                    <label>{t('orders.hasObservations')}</label>
                    <select
                      value={hasObservations}
                      onChange={(e) => { setHasObservations(e.target.value); setPage(1); }}
                      className="filter-input"
                    >
                      <option value="">{t('orders.any')}</option>
                      <option value="true">{t('orders.yes')}</option>
                      <option value="false">{t('orders.no')}</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>{t('products.reference')}</label>
                    <input
                      type="text"
                      placeholder={t('products.reference')}
                      value={productReferenceFilter}
                      onChange={(e) => { setProductReferenceFilter(e.target.value); setPage(1); }}
                      className="filter-input"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="active-filters-summary">
              <div className="active-filters-header">
                <span className="filter-label">{t('orders.activeFilters')}:</span>
                <button className="btn-link-small" onClick={clearFilters}>
                  {t('common.clearAll')}
                </button>
              </div>
              <div className="filter-tags">
                {searchQuery && (
                  <span className="filter-tag">
                    {t('orders.search')}: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')}><X size={12} /></button>
                  </span>
                )}
                {statusFilter.map((status) => (
                  <span key={status} className="filter-tag">
                    {t('common.status')}: {getStatusLabel(status)}
                    <button onClick={() => handleStatusFilterChange(status)}><X size={12} /></button>
                  </span>
                ))}
                {dateFrom && (
                  <span className="filter-tag">
                    {t('orders.createdFrom')}: {formatDateTime(dateFrom)}
                    <button onClick={() => { setDateFrom(''); setPage(1); }}><X size={12} /></button>
                  </span>
                )}
                {dateTo && (
                  <span className="filter-tag">
                    {t('orders.createdTo')}: {formatDateTime(dateTo)}
                    <button onClick={() => { setDateTo(''); setPage(1); }}><X size={12} /></button>
                  </span>
                )}
                {supplierFilter.length > 0 && (
                  <span className="filter-tag">
                    {t('orders.suppliers')}: {supplierFilter.length}
                    <button onClick={() => { setSupplierFilter([]); setPage(1); }}><X size={12} /></button>
                  </span>
                )}
                {customerFilter && (
                  <span className="filter-tag">
                    {t('orders.customer')}: {customersList.find(c => c.id === customerFilter)?.name || customerFilter}
                    <button onClick={() => { setCustomerFilter(''); setPage(1); }}><X size={12} /></button>
                  </span>
                )}
                {(minAmount || maxAmount) && (
                  <span className="filter-tag">
                    {t('orders.amount')}: {minAmount || '0'} - {maxAmount || '∞'}
                    <button onClick={() => { setMinAmount(''); setMaxAmount(''); setPage(1); }}><X size={12} /></button>
                  </span>
                )}
                {hasObservations && (
                  <span className="filter-tag">
                    {t('orders.hasObservations')}: {hasObservations === 'true' ? t('orders.yes') : t('orders.no')}
                    <button onClick={() => { setHasObservations(''); setPage(1); }}><X size={12} /></button>
                  </span>
                )}
                {productReferenceFilter.trim() && (
                  <span className="filter-tag">
                    {t('products.reference')}: "{productReferenceFilter}"
                    <button onClick={() => { setProductReferenceFilter(''); setPage(1); }}><X size={12} /></button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

          {orders.length === 0 && !loading ? (
            <div className="empty-state">
              <p>{t('orders.noOrders')}</p>
              {hasActiveFilters ? (
                <button className="btn-secondary" onClick={clearFilters}>
                  {t('common.clearFilters')}
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={() => navigate('/orders/create')}
                >
                  <Plus size={20} />
                  {t('orders.createFirstOrder')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="orders-list-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('orderNumber')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('orders.orderNumber')}
                      {getSortIcon('orderNumber')}
                    </div>
                  </th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('customerName')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('orders.customerName')}
                      {getSortIcon('customerName')}
                    </div>
                  </th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('status')}
                    style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      {t('common.status')}
                      {getSortIcon('status')}
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
                  <th>{t('orders.suppliers')}</th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('createdBy')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('orders.createdBy')}
                      {getSortIcon('createdBy')}
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
                      {t('orders.updatedAt') || 'Last Updated'}
                      {getSortIcon('updatedAt')}
                    </div>
                  </th>
                  <th>{t('orders.hasObservations')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  onContextMenu={(e) => handleRowRightClick(e, order)}
                  className="order-row"
                >
                  <td>
                    <span 
                      className="order-id clickable-copy" 
                      onClick={(e) => {
                        e.stopPropagation();
                        const orderNumber = order.orderNumber?.toString() || order.id;
                        const textToCopy = t('orders.copyOrderNumberText', { orderNumber });
                        navigator.clipboard.writeText(textToCopy);
                        toast.success(textToCopy, { duration: 3000 });
                      }}
                      title={t('orders.clickToCopy')}
                      style={{ cursor: 'pointer', textDecoration: 'underline', fontSize: '1.1rem', fontWeight: 600 }}
                    >
                      {order.orderNumber || '-'}
                    </span>
                  </td>
                  <td>{order.customerName || order.customer?.name || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span 
                      className="status-badge status-custom"
                      style={getStatusStyle(order.status)}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const phone = order.customerPhone || order.customer?.phone;
                      if (!phone) return '-';
                      const fullPhone = order.countryCode || order.customer?.countryCode 
                        ? `${order.countryCode || order.customer?.countryCode} ${phone}`
                        : phone;
                      return (
                        <span
                          className="phone-link clickable-copy"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(fullPhone);
                            toast.success(t('common.copied'));
                          }}
                          title={t('orders.clickToCopy')}
                          style={{ 
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            display: 'block',
                            width: '100%'
                          }}
                        >
                          {phone}
                        </span>
                      );
                    })()}
                  </td>
                  <td>{order.suppliers?.length || 0}</td>
                  <td>{order.createdBy?.username || '-'}</td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>{formatDateTime(order.updatedAt)}</td>
                  <td>
                    {order.observations?.trim() ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          backgroundColor: 'var(--warning-light, #fef3c7)',
                          color: 'var(--warning, #f59e0b)',
                          border: '1px solid var(--warning, #f59e0b)',
                        }}
                      >
                        {t('common.yes')}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {t('common.no')}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${order.id}`);
                      }}
                    >
                      {t('orders.viewDetails')}
                    </button>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || loading}
              >
                <ChevronLeft size={18} />
                {t('common.previous')}
              </button>
              <div className="pagination-info">
                {t('common.page')} {pagination.page} {t('common.of')} {pagination.totalPages} ({pagination.total} {t('common.total')})
              </div>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === pagination.totalPages || loading}
              >
                {t('common.next')}
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          </>
          )}
        </>
      )}

      {/* Supplier Analytics Tab Content */}
      {isAdmin && activeTab !== 'orders' && (
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>{t('orders.supplierMonthlyAssessment')}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                className="btn-secondary"
                onClick={handleExportSupplierAnalytics}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Download size={18} />
                {t('orders.exportSupplierAnalytics')}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontWeight: 500 }}>{t('orders.year')}:</label>
                <select
                  value={supplierAnalyticsYear}
                  onChange={(e) => setSupplierAnalyticsYear(parseInt(e.target.value))}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9375rem',
                  }}
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const currentYear = new Date().getFullYear();
                    // Show 2 years in the future and 7 years in the past
                    return currentYear + 2 - i;
                  }).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontWeight: 500 }}>{t('orders.month')}:</label>
                <select
                  value={supplierAnalyticsMonth === null ? '' : supplierAnalyticsMonth}
                  onChange={(e) => setSupplierAnalyticsMonth(e.target.value === '' ? null : parseInt(e.target.value))}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9375rem',
                  }}
                >
                  <option value="">{t('orders.allMonths')}</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthNum = i + 1;
                    const monthNames = [
                      t('orders.january'), t('orders.february'), t('orders.march'), t('orders.april'),
                      t('orders.may'), t('orders.june'), t('orders.july'), t('orders.august'),
                      t('orders.september'), t('orders.october'), t('orders.november'), t('orders.december')
                    ];
                    return (
                      <option key={monthNum} value={monthNum}>
                        {monthNames[i]}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {supplierAnalyticsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
              <Loader2 className="spinner" size={32} />
            </div>
          ) : supplierAnalyticsData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <p>{t('orders.noSupplierData')}</p>
            </div>
          ) : (
            <div>
              {/* View and Chart Type Selectors */}
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontWeight: 500 }}>{t('orders.view')}:</label>
                  <select
                    value={supplierAnalyticsView}
                    onChange={(e) => setSupplierAnalyticsView(e.target.value as 'chart' | 'table' | 'both')}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9375rem',
                      minWidth: '150px',
                    }}
                  >
                    <option value="chart">{t('orders.chart')}</option>
                    <option value="table">{t('orders.table')}</option>
                    <option value="both">{t('orders.chartAndTable')}</option>
                  </select>
                </div>
                {(supplierAnalyticsView === 'chart' || supplierAnalyticsView === 'both') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontWeight: 500 }}>{t('orders.chartType')}:</label>
                    <select
                      value={supplierAnalyticsChartType}
                      onChange={(e) => setSupplierAnalyticsChartType(e.target.value as 'amount' | 'count')}
                      style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9375rem',
                        minWidth: '200px',
                      }}
                    >
                      <option value="amount">{t('orders.totalAmountByMonth')}</option>
                      <option value="count">{t('orders.orderCountByMonth')}</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Chart for Total Amount */}
              {(supplierAnalyticsView === 'chart' || supplierAnalyticsView === 'both') && supplierAnalyticsChartType === 'amount' && (
                <div>
                  <h3 style={{ marginBottom: '1rem' }}>{t('orders.totalAmountByMonth')}</h3>
                  <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={(() => {
                    // Prepare data for chart - combine all suppliers by month
                    // Ensure all 12 months are included
                    const monthMap = new Map<string, { month: string; [key: string]: any }>();
                    
                    // Initialize months (all months if no month filter, or just the selected month)
                    const monthsToInclude = supplierAnalyticsMonth !== null 
                      ? [supplierAnalyticsMonth] 
                      : Array.from({ length: 12 }, (_, i) => i + 1);
                    
                    monthsToInclude.forEach((m) => {
                      const monthStr = `${supplierAnalyticsYear}-${String(m).padStart(2, '0')}`;
                      monthMap.set(monthStr, { month: monthStr });
                    });
                    
                    // Fill in supplier data
                    supplierAnalyticsData.forEach((supplier) => {
                      supplier.monthlyData.forEach((monthData: { month: string; totalAmount: number; orderCount: number }) => {
                        if (monthMap.has(monthData.month)) {
                          monthMap.get(monthData.month)![supplier.supplierName] = monthData.totalAmount;
                        }
                      });
                    });
                    
                    // Set 0 for suppliers that don't have data for a month
                    supplierAnalyticsData.forEach((supplier) => {
                      monthMap.forEach((monthData, month) => {
                        if (!(supplier.supplierName in monthData)) {
                          monthData[supplier.supplierName] = 0;
                        }
                      });
                    });
                    
                    return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis 
                      dataKey="month" 
                      stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)' }}
                    />
                    <YAxis 
                      stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)' }}
                      tickFormatter={(value) => `€${value.toFixed(0)}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card-bg)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)'
                      }}
                      formatter={(value: any) => `€${parseFloat(value).toFixed(2)}`}
                    />
                    <Legend />
                    {supplierAnalyticsData.map((supplier, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                      return (
                        <Line
                          key={supplier.supplierId}
                          type="monotone"
                          dataKey={supplier.supplierName}
                          stroke={colors[index % colors.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
                </div>
              )}

              {/* Chart for Order Count */}
              {(supplierAnalyticsView === 'chart' || supplierAnalyticsView === 'both') && supplierAnalyticsChartType === 'count' && (
                <div>
                  <h3 style={{ marginBottom: '1rem' }}>{t('orders.orderCountByMonth')}</h3>
                  <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={(() => {
                    // Prepare data for chart - combine all suppliers by month
                    // Ensure all 12 months are included
                    const monthMap = new Map<string, { month: string; [key: string]: any }>();
                    
                    // Initialize months (all months if no month filter, or just the selected month)
                    const monthsToInclude = supplierAnalyticsMonth !== null 
                      ? [supplierAnalyticsMonth] 
                      : Array.from({ length: 12 }, (_, i) => i + 1);
                    
                    monthsToInclude.forEach((m) => {
                      const monthStr = `${supplierAnalyticsYear}-${String(m).padStart(2, '0')}`;
                      monthMap.set(monthStr, { month: monthStr });
                    });
                    
                    // Fill in supplier data
                    supplierAnalyticsData.forEach((supplier) => {
                      supplier.monthlyData.forEach((monthData: { month: string; totalAmount: number; orderCount: number }) => {
                        if (monthMap.has(monthData.month)) {
                          monthMap.get(monthData.month)![supplier.supplierName] = monthData.orderCount;
                        }
                      });
                    });
                    
                    // Set 0 for suppliers that don't have data for a month
                    supplierAnalyticsData.forEach((supplier) => {
                      monthMap.forEach((monthData, month) => {
                        if (!(supplier.supplierName in monthData)) {
                          monthData[supplier.supplierName] = 0;
                        }
                      });
                    });
                    
                    return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis 
                      dataKey="month" 
                      stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)' }}
                    />
                    <YAxis 
                      stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card-bg)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <Legend />
                    {supplierAnalyticsData.map((supplier, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                      return (
                        <Bar
                          key={supplier.supplierId}
                          dataKey={supplier.supplierName}
                          fill={colors[index % colors.length]}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
                </div>
              )}

              {/* Table View */}
              {(supplierAnalyticsView === 'table' || supplierAnalyticsView === 'both') && (
                <div style={{ marginTop: supplierAnalyticsView === 'both' ? '2rem' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ margin: 0 }}>{t('orders.supplierAnalyticsTable')}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                      <input
                        type="text"
                        placeholder={t('orders.filterBySupplier')}
                        value={supplierAnalyticsTableFilter}
                        onChange={(e) => setSupplierAnalyticsTableFilter(e.target.value)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9375rem',
                          minWidth: '250px',
                        }}
                      />
                      {supplierAnalyticsTableFilter && (
                        <button
                          onClick={() => setSupplierAnalyticsTableFilter('')}
                          style={{
                            padding: '0.5rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--input-bg)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title={t('common.clearSearch')}
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--card-bg)' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {t('orders.supplier')}
                          </th>
                          {supplierAnalyticsMonth !== null && (
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {t('orders.month')}
                            </th>
                          )}
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {t('orders.totalAmount')}
                          </th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {t('orders.orderCount')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // If a specific month is selected, show monthly data
                          // If all months is selected, aggregate totals by supplier
                          if (supplierAnalyticsMonth !== null) {
                            // Show individual month rows
                            const tableData: Array<{
                              supplierName: string;
                              month: string;
                              totalAmount: number;
                              orderCount: number;
                            }> = [];
                            
                            supplierAnalyticsData
                              .filter((supplier) => 
                                !supplierAnalyticsTableFilter || 
                                supplier.supplierName.toLowerCase().includes(supplierAnalyticsTableFilter.toLowerCase())
                              )
                              .forEach((supplier) => {
                                supplier.monthlyData.forEach((monthData: { month: string; totalAmount: number; orderCount: number }) => {
                                  tableData.push({
                                    supplierName: supplier.supplierName,
                                    month: monthData.month,
                                    totalAmount: monthData.totalAmount,
                                    orderCount: monthData.orderCount,
                                  });
                                });
                              });
                            
                            // Sort by month, then by supplier name
                            tableData.sort((a, b) => {
                              if (a.month !== b.month) {
                                return a.month.localeCompare(b.month);
                              }
                              return a.supplierName.localeCompare(b.supplierName);
                            });
                            
                            if (tableData.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    {supplierAnalyticsTableFilter 
                                      ? t('orders.noSupplierDataFiltered')
                                      : t('orders.noSupplierData')
                                    }
                                  </td>
                                </tr>
                              );
                            }
                            
                            return tableData.map((row, index) => (
                              <tr 
                                key={`${row.supplierName}-${row.month}`}
                                style={{ 
                                  borderBottom: '1px solid var(--border-color)',
                                  backgroundColor: index % 2 === 0 ? 'var(--card-bg)' : 'var(--bg-secondary)'
                                }}
                              >
                                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)' }}>
                                  {row.supplierName}
                                </td>
                                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)' }}>
                                  {row.month}
                                </td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>
                                  {row.totalAmount.toFixed(2)} €
                                </td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>
                                  {row.orderCount}
                                </td>
                              </tr>
                            ));
                          } else {
                            // Aggregate totals by supplier for all months
                            const aggregatedData = new Map<string, { totalAmount: number; orderCount: number }>();
                            
                            supplierAnalyticsData
                              .filter((supplier) => 
                                !supplierAnalyticsTableFilter || 
                                supplier.supplierName.toLowerCase().includes(supplierAnalyticsTableFilter.toLowerCase())
                              )
                              .forEach((supplier) => {
                                let totalAmount = 0;
                                let totalOrderCount = 0;
                                
                                supplier.monthlyData.forEach((monthData: { month: string; totalAmount: number; orderCount: number }) => {
                                  totalAmount += monthData.totalAmount;
                                  totalOrderCount += monthData.orderCount;
                                });
                                
                                if (totalAmount > 0 || totalOrderCount > 0) {
                                  aggregatedData.set(supplier.supplierName, {
                                    totalAmount,
                                    orderCount: totalOrderCount,
                                  });
                                }
                              });
                            
                            const tableData = Array.from(aggregatedData.entries())
                              .map(([supplierName, data]) => ({
                                supplierName,
                                totalAmount: data.totalAmount,
                                orderCount: data.orderCount,
                              }))
                              .sort((a, b) => a.supplierName.localeCompare(b.supplierName));
                            
                            if (tableData.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    {supplierAnalyticsTableFilter 
                                      ? t('orders.noSupplierDataFiltered')
                                      : t('orders.noSupplierData')
                                    }
                                  </td>
                                </tr>
                              );
                            }
                            
                            return tableData.map((row, index) => (
                              <tr 
                                key={row.supplierName}
                                style={{ 
                                  borderBottom: '1px solid var(--border-color)',
                                  backgroundColor: index % 2 === 0 ? 'var(--card-bg)' : 'var(--bg-secondary)'
                                }}
                              >
                                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)' }}>
                                  {row.supplierName}
                                </td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>
                                  {row.totalAmount.toFixed(2)} €
                                </td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>
                                  {row.orderCount}
                                </td>
                              </tr>
                            ));
                          }
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu
        items={selectedOrder ? getContextMenuItems(selectedOrder) : []}
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        onClose={hideContextMenu}
      />

      {/* WhatsApp Confirmation Modal */}
      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onConfirm={confirmWhatsAppSend}
        phoneNumber={(() => {
          const phone = selectedOrder?.customerPhone || selectedOrder?.customer?.phone || '';
          const countryCode = selectedOrder?.countryCode || selectedOrder?.customer?.countryCode || '+34';
          return phone ? `${countryCode}${phone}` : '';
        })()}
        initialMessage={whatsappMessage}
      />
    </div>
  );
}

                                       