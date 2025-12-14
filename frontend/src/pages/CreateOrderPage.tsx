import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, X, Save, Loader2, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import '../styles/create-order.css';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  supplierId: string;
  reference: string;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  countryCode?: string;
}

interface SupplierData {
  id: string;
  name: string;
  products: ProductData[];
}

interface ProductData {
  id: string;
  productRef: string;
  quantity: string;
  price: string;
}

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [observations, setObservations] = useState('');
  
  // Country code is fixed to +34 for Spain
  const countryCode = '+34';
  const [suppliers, setSuppliers] = useState<SupplierData[]>([
    {
      id: Date.now().toString(),
      name: '',
      products: [
        {
          id: Date.now().toString(),
          productRef: '',
          quantity: '',
          price: '',
        },
      ],
    },
  ]);

  // Fetch suppliers, products, and customers for hints
  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
    fetchCustomers();
  }, []);

  // Fetch customers when customer name changes (for autocomplete)
  useEffect(() => {
    if (customerName.trim()) {
      const timeoutId = setTimeout(() => {
        searchCustomers(customerName);
      }, 300); // Debounce search
      return () => clearTimeout(timeoutId);
    } else {
      fetchCustomers(); // Fetch all customers when empty
    }
  }, [customerName]);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get<{ success: true; data: Supplier[] }>('/suppliers');
      setSuppliersList(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      // Don't show error toast - hints are optional
    }
  };

  const fetchProducts = async (supplierId?: string) => {
    try {
      const params = supplierId ? { supplierId } : {};
      const response = await api.get<{ success: true; data: Product[] }>('/products', { params });
      setProductsList(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      // Don't show error toast - hints are optional
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get<{ success: true; data: Customer[] }>('/customers/search');
      setCustomersList(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      // Don't show error toast - hints are optional
    }
  };

  const searchCustomers = async (query: string) => {
    try {
      const response = await api.get<{ success: true; data: Customer[] }>('/customers/search', {
        params: { q: query, limit: 20 },
      });
      setCustomersList(response.data.data || []);
    } catch (error) {
      console.error('Failed to search customers:', error);
    }
  };

  const handleCustomerNameChange = (value: string) => {
    setCustomerName(value);
    setCustomerId(null); // Reset customer ID when name changes
    
    // Find matching customer and pre-fill phone
    const matchingCustomer = customersList.find(
      (c) => c.name.toLowerCase() === value.toLowerCase()
    );
    
    if (matchingCustomer) {
      setCustomerId(matchingCustomer.id);
      setCustomerPhone(matchingCustomer.phone || '');
    }
  };

  const addSupplier = () => {
    setSuppliers([
      ...suppliers,
      {
        id: Date.now().toString(),
        name: '',
        products: [
          {
            id: Date.now().toString(),
            productRef: '',
            quantity: '',
            price: '',
          },
        ],
      },
    ]);
  };

  const removeSupplier = (supplierId: string) => {
    if (suppliers.length === 1) {
      toast.error(t('createOrder.atLeastOneSupplier'));
      return;
    }
    setSuppliers(suppliers.filter((s) => s.id !== supplierId));
  };

  const updateSupplierName = (supplierId: string, name: string) => {
    setSuppliers(
      suppliers.map((s) => {
        if (s.id === supplierId) {
          return { ...s, name };
        }
        return s;
      })
    );
  };

  const addProduct = (supplierId: string) => {
    setSuppliers(
      suppliers.map((s) => {
        if (s.id === supplierId) {
          return {
            ...s,
            products: [
              ...s.products,
              {
                id: Date.now().toString(),
                productRef: '',
                quantity: '',
                price: '',
              },
            ],
          };
        }
        return s;
      })
    );
  };

  const removeProduct = (supplierId: string, productId: string) => {
    setSuppliers(
      suppliers.map((s) => {
        if (s.id === supplierId) {
          if (s.products.length === 1) {
            toast.error(t('createOrder.atLeastOneProduct'));
            return s;
          }
          return {
            ...s,
            products: s.products.filter((p) => p.id !== productId),
          };
        }
        return s;
      })
    );
  };

  const updateProduct = (
    supplierId: string,
    productId: string,
    field: 'productRef' | 'quantity' | 'price',
    value: string
  ) => {
    setSuppliers(
      suppliers.map((s) => {
        if (s.id === supplierId) {
          return {
            ...s,
            products: s.products.map((p) => {
              if (p.id === productId) {
                return { ...p, [field]: value };
              }
              return p;
            }),
          };
        }
        return s;
      })
    );
  };

  const getSupplierHints = (input: string) => {
    if (!input.trim()) return suppliersList;
    const lowerInput = input.toLowerCase();
    return suppliersList.filter((s) => s.name.toLowerCase().includes(lowerInput));
  };

  const getProductHints = (supplierName: string, input: string) => {
    // Find supplier ID from name
    const supplier = suppliersList.find((s) => s.name.toLowerCase() === supplierName.toLowerCase());
    if (!supplier) return productsList;
    
    const filteredProducts = productsList.filter((p) => p.supplierId === supplier.id);
    if (!input.trim()) return filteredProducts;
    
    const lowerInput = input.toLowerCase();
    return filteredProducts.filter((p) => p.reference.toLowerCase().includes(lowerInput));
  };

  const validateForm = (): boolean => {
    // Phone is now optional, no validation needed

    for (const supplier of suppliers) {
      if (!supplier.name.trim()) {
        toast.error(t('createOrder.supplierRequired'));
        return false;
      }

      for (const product of supplier.products) {
        if (!product.productRef.trim()) {
          toast.error(t('createOrder.productRefRequired'));
          return false;
        }
        if (!product.quantity.trim()) {
          toast.error(t('createOrder.quantityRequired'));
          return false;
        }
        if (!product.price.trim()) {
          toast.error(t('createOrder.priceRequired'));
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        // orderNumber is auto-generated by backend
        customerName: customerName.trim() || undefined,
        customerId: customerId || undefined,
        customerPhone: customerPhone.trim() || undefined,
        countryCode: countryCode || '+34',
        observations: observations.trim() || undefined,
        suppliers: suppliers.map((s) => ({
          name: s.name.trim(),
          products: s.products.map((p) => ({
            productRef: p.productRef.trim(),
            quantity: p.quantity.trim(),
            price: p.price.trim(),
          })),
        })),
      };

      await api.post('/orders', orderData);
      
      toast.success(t('createOrder.createSuccess'));
      navigate('/orders');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('createOrder.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button
          className="btn-icon"
          onClick={() => navigate('/orders')}
          title={t('orderDetail.backToOrders')}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>{t('createOrder.title')}</h1>
          <p className="page-subtitle">{t('createOrder.registerOrder')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="create-order-form">
        {/* Customer Information */}
        <section className="form-section">
          <h2>{t('createOrder.customerInfo')}</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="customerName">{t('createOrder.customerNameOptional')}</label>
              <input
                id="customerName"
                type="text"
                list="customer-hints"
                value={customerName}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
                placeholder={t('createOrder.enterCustomerName')}
                className="form-input"
              />
              <datalist id="customer-hints">
                {customersList.map((customer) => (
                  <option key={customer.id} value={customer.name} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label htmlFor="customerPhone">
                {t('createOrder.customerPhone')} <span className="optional">({t('common.optional')})</span>
              </label>
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
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={t('createOrder.enterCustomerPhone')}
                  className="form-input"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="observations">{t('createOrder.observationsOptional')}</label>
            <textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder={t('createOrder.additionalNotes')}
              className="form-input form-textarea"
              rows={3}
            />
          </div>
        </section>

        {/* Suppliers and Products */}
        <section className="form-section">
          <div className="section-header">
            <h2>{t('createOrder.suppliersAndProducts')}</h2>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={addSupplier}
            >
              <Plus size={16} />
              {t('createOrder.addSupplier')}
            </button>
          </div>

          {suppliers.map((supplier, supplierIndex) => (
            <div 
              key={supplier.id} 
              className="supplier-card"
              data-supplier-index={supplierIndex}
              style={{
                borderLeft: `4px solid var(--supplier-color-${(supplierIndex % 6) + 1})`,
                boxShadow: `0 2px 8px rgba(0, 0, 0, 0.08), inset 0 0 0 1px var(--supplier-color-${(supplierIndex % 6) + 1})20`
              }}
            >
              <div className="supplier-header">
                <div className="supplier-title">
                  <span className="supplier-number">{t('createOrder.supplier')} {supplierIndex + 1}</span>
                  {suppliers.length > 1 && (
                    <button
                      type="button"
                      className="btn-icon btn-danger"
                      onClick={() => removeSupplier(supplier.id)}
                      title={t('createOrder.removeSupplier')}
                      aria-label={t('createOrder.removeSupplier')}
                    >
                      <X />
                    </button>
                  )}
                </div>
                <div className="form-group">
                  <label>
                    {t('createOrder.supplierName')} <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    list={`supplier-hints-${supplier.id}`}
                    value={supplier.name}
                    onChange={(e) => updateSupplierName(supplier.id, e.target.value)}
                    placeholder={t('createOrder.enterSupplierName')}
                    className="form-input"
                    required
                  />
                  <datalist id={`supplier-hints-${supplier.id}`}>
                    {getSupplierHints(supplier.name).map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="products-container">
                <div className="products-header">
                  <h3>{t('createOrder.products')}</h3>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => addProduct(supplier.id)}
                  >
                    <Plus size={16} />
                    {t('createOrder.addProduct')}
                  </button>
                </div>

                {supplier.products.map((product, productIndex) => (
                  <div key={product.id} className="product-row">
                    <div className="form-group">
                      <label>
                        {t('createOrder.productReference')} <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        value={product.productRef}
                        onChange={(e) =>
                          updateProduct(supplier.id, product.id, 'productRef', e.target.value)
                        }
                        placeholder={t('createOrder.enterProductRef')}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        {t('orderDetail.quantity')} <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        value={product.quantity}
                        onChange={(e) =>
                          updateProduct(supplier.id, product.id, 'quantity', e.target.value)
                        }
                        placeholder={t('createOrder.enterQuantity')}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        {t('orderDetail.price')} <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        value={product.price}
                        onChange={(e) =>
                          updateProduct(supplier.id, product.id, 'price', e.target.value)
                        }
                        placeholder={t('createOrder.enterPrice')}
                        className="form-input"
                        required
                      />
                    </div>
                    {supplier.products.length > 1 && (
                      <button
                        type="button"
                        className="btn-icon btn-danger"
                        onClick={() => removeProduct(supplier.id, product.id)}
                        title={t('createOrder.removeProduct')}
                        aria-label={t('createOrder.removeProduct')}
                      >
                        <X />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/orders')}
            disabled={loading}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="spinner" size={18} />
                {t('common.loading')}
              </>
            ) : (
              <>
                <Save size={18} />
                {t('orders.createOrder')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

