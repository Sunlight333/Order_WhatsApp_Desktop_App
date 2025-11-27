import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, Save, Loader2, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/edit-order.css';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  supplierId: string;
  reference: string;
}

interface OrderProduct {
  id: string;
  supplierId: string;
  productRef: string;
  quantity: string;
  price: string;
  supplier: {
    id: string;
    name: string;
  };
}

interface Order {
  id: string;
  customerName?: string;
  customerPhone: string;
  observations?: string;
  products: OrderProduct[];
  suppliers: Array<{
    id: string;
    name: string;
  }>;
}

interface SupplierData {
  id: string;
  name: string;
  supplierId?: string;
  products: ProductData[];
}

interface ProductData {
  id: string;
  productRef: string;
  quantity: string;
  price: string;
}

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [observations, setObservations] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);

  useEffect(() => {
    if (id) {
      fetchOrder(id);
      fetchSuppliers();
      fetchProducts();
    }
  }, [id]);

  const fetchOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await api.get<{ success: true; data: Order }>(`/orders/${orderId}`);
      const order = response.data.data;

      // Set customer info
      setCustomerName(order.customerName || '');
      setCustomerPhone(order.customerPhone);
      setObservations(order.observations || '');

      // Group products by supplier
      const supplierMap = new Map<string, SupplierData>();
      
      order.products.forEach((product) => {
        const supplierId = product.supplier.id;
        if (!supplierMap.has(supplierId)) {
          supplierMap.set(supplierId, {
            id: Date.now().toString() + Math.random(),
            name: product.supplier.name,
            supplierId: product.supplier.id,
            products: [],
          });
        }

        supplierMap.get(supplierId)!.products.push({
          id: Date.now().toString() + Math.random(),
          productRef: product.productRef,
          quantity: product.quantity,
          price: product.price,
        });
      });

      setSuppliers(Array.from(supplierMap.values()));
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to load order');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get<{ success: true; data: Supplier[] }>('/suppliers');
      setSuppliersList(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchProducts = async (supplierId?: string) => {
    try {
      const params = supplierId ? { supplierId } : {};
      const response = await api.get<{ success: true; data: Product[] }>('/products', { params });
      setProductsList(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
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
      toast.error('At least one supplier is required');
      return;
    }
    setSuppliers(suppliers.filter((s) => s.id !== supplierId));
  };

  const updateSupplierName = (supplierId: string, name: string) => {
    setSuppliers(
      suppliers.map((s) => {
        if (s.id === supplierId) {
          return { ...s, name, supplierId: undefined };
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
            toast.error('At least one product is required per supplier');
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
    const supplier = suppliersList.find((s) => s.name.toLowerCase() === supplierName.toLowerCase());
    if (!supplier) return productsList;
    
    const filteredProducts = productsList.filter((p) => p.supplierId === supplier.id);
    if (!input.trim()) return filteredProducts;
    
    const lowerInput = input.toLowerCase();
    return filteredProducts.filter((p) => p.reference.toLowerCase().includes(lowerInput));
  };

  const validateForm = (): boolean => {
    if (!customerPhone.trim()) {
      toast.error('Customer phone is required');
      return false;
    }

    for (const supplier of suppliers) {
      if (!supplier.name.trim()) {
        toast.error('All suppliers must have a name');
        return false;
      }

      for (const product of supplier.products) {
        if (!product.productRef.trim()) {
          toast.error('All products must have a reference');
          return false;
        }
        if (!product.quantity.trim()) {
          toast.error('All products must have a quantity');
          return false;
        }
        if (!product.price.trim()) {
          toast.error('All products must have a price');
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Show confirmation modal instead of directly saving
    setShowSaveModal(true);
  };

  const confirmSave = async () => {
    try {
      setSaving(true);
      setShowSaveModal(false);

      const orderData = {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim(),
        observations: observations.trim() || undefined,
        suppliers: suppliers.map((s) => ({
          name: s.name.trim(),
          supplierId: s.supplierId,
          products: s.products.map((p) => ({
            productRef: p.productRef.trim(),
            quantity: p.quantity.trim(),
            price: p.price.trim(),
          })),
        })),
      };

      await api.put(`/orders/${id}`, orderData);
      
      toast.success('Order updated successfully!');
      navigate(`/orders/${id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <p>Loading order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button
          className="btn-icon"
          onClick={() => navigate(`/orders/${id}`)}
          title="Back to order details"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>Edit Order</h1>
          <p className="page-subtitle">Update order information and products</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="edit-order-form">
        {/* Customer Information */}
        <section className="form-section">
          <h2>Customer Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="customerName">Customer Name (Optional)</label>
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="customerPhone">
                Customer Phone <span className="required">*</span>
              </label>
              <input
                id="customerPhone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+1234567890"
                className="form-input"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="observations">Observations (Optional)</label>
            <textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Additional notes or observations..."
              className="form-input form-textarea"
              rows={3}
            />
          </div>
        </section>

        {/* Suppliers and Products */}
        <section className="form-section">
          <div className="section-header">
            <h2>Suppliers & Products</h2>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={addSupplier}
            >
              <Plus size={16} />
              Add Supplier
            </button>
          </div>

          {suppliers.map((supplier, supplierIndex) => (
            <div key={supplier.id} className="supplier-card">
              <div className="supplier-header">
                <div className="supplier-title">
                  <span className="supplier-number">Supplier {supplierIndex + 1}</span>
                  {suppliers.length > 1 && (
                    <button
                      type="button"
                      className="btn-icon btn-danger"
                      onClick={() => removeSupplier(supplier.id)}
                      title="Remove supplier"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <div className="form-group">
                  <label>
                    Supplier Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    list={`supplier-hints-${supplier.id}`}
                    value={supplier.name}
                    onChange={(e) => updateSupplierName(supplier.id, e.target.value)}
                    placeholder="Type supplier name (new suppliers will be created automatically)"
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
                  <h3>Products</h3>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => addProduct(supplier.id)}
                  >
                    <Plus size={16} />
                    Add Product
                  </button>
                </div>

                {supplier.products.map((product, productIndex) => (
                  <div key={product.id} className="product-row">
                    <div className="form-group">
                      <label>
                        Product Reference <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        list={`product-hints-${supplier.id}-${product.id}`}
                        value={product.productRef}
                        onChange={(e) =>
                          updateProduct(supplier.id, product.id, 'productRef', e.target.value)
                        }
                        placeholder="Type product reference"
                        className="form-input"
                        required
                      />
                      <datalist id={`product-hints-${supplier.id}-${product.id}`}>
                        {getProductHints(supplier.name, product.productRef).map((p) => (
                          <option key={p.id} value={p.reference} />
                        ))}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label>
                        Quantity <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        value={product.quantity}
                        onChange={(e) =>
                          updateProduct(supplier.id, product.id, 'quantity', e.target.value)
                        }
                        placeholder="e.g., 2"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        Price <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        value={product.price}
                        onChange={(e) =>
                          updateProduct(supplier.id, product.id, 'price', e.target.value)
                        }
                        placeholder="e.g., 29.99"
                        className="form-input"
                        required
                      />
                    </div>
                    {supplier.products.length > 1 && (
                      <button
                        type="button"
                        className="btn-icon btn-danger"
                        onClick={() => removeProduct(supplier.id, product.id)}
                        title="Remove product"
                      >
                        <X size={18} />
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
            onClick={() => navigate(`/orders/${id}`)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="spinner" size={18} />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Save Confirmation Modal */}
      <ConfirmModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onConfirm={confirmSave}
        title="Confirm Order Update"
        message={
          <div>
            <p>Are you sure you want to update this order?</p>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              All changes will be saved and recorded in the order's audit log. This action will update the order status and history.
            </p>
          </div>
        }
        confirmText="Save Changes"
        cancelText="Cancel"
        type="info"
        loading={saving}
      />
    </div>
  );
}
