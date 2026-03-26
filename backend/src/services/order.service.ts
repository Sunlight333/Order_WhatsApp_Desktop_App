import { getPrismaClient } from '../config/database';
import { createError } from '../utils/error.util';
import { findOrCreateCustomer, CreateCustomerInput } from './customer.service';
import { getConfigValue, updateConfigValue } from './config.service';
import { calculateOrderStatus } from './order-status-calculator';
import { isOrderStatus, type OrderStatus } from '../constants/order-status';

const prisma = getPrismaClient();

export interface CreateOrderInput {
  // orderNumber is auto-generated, not user-editable
  customerName?: string;
  customerId?: string; // Reference to existing customer
  customerPhone?: string; // Optional now
  countryCode?: string; // Country code for phone (default +34)
  observations?: string;
  suppliers: Array<{
    name: string;
    supplierId?: string;
    products: Array<{
      productRef: string;
      productId?: string;
      quantity: string;
      price: string;
    }>;
  }>;
}

export interface UpdateOrderInput {
  // orderNumber cannot be updated once created
  customerName?: string;
  customerId?: string; // Reference to existing customer
  customerPhone?: string; // Optional now
  countryCode?: string; // Country code for phone (default +34)
  observations?: string | null; // Allow null to clear observations
  suppliers: Array<{
    name: string;
    supplierId?: string;
    products: Array<{
      productRef: string;
      productId?: string;
      quantity: string;
      price: string;
    }>;
  }>;
}

/**
 * Create a new order
 */
export async function createOrder(userId: string, input: CreateOrderInput) {
  // Get order counter and prefix from config before transaction
  const counterConfig = await getConfigValue('orderCounter');
  const prefixConfig = await getConfigValue('orderPrefix');
  
  let counter = 0;
  if (counterConfig?.value) {
    counter = parseInt(counterConfig.value, 10) || 0;
  }
  
  const prefix = prefixConfig?.value || '';
  
  // Increment counter
  counter++;
  
  // Generate order number: if prefix exists, combine prefix + counter (e.g., 25001)
  // Otherwise, use counter directly (e.g., 1, 2, 3...)
  let orderNumber: number;
  if (prefix) {
    // Combine prefix with counter (e.g., prefix "25" + counter 1 = 25001)
    orderNumber = parseInt(`${prefix}${String(counter).padStart(3, '0')}`, 10);
  } else {
    orderNumber = counter;
  }
  
  // Execute transaction to create order and related data
  const orderId = await prisma.$transaction(async (tx) => {
    // Helper functions for transaction context
    const findOrCreateSupplierInTx = async (name: string) => {
      const trimmedName = name.trim();
      const allSuppliers = await tx.supplier.findMany();
      let supplier = allSuppliers.find(
        (s) => s.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (!supplier) {
        supplier = await tx.supplier.create({
          data: {
            name: trimmedName,
          },
        });
      }

      return supplier;
    };

    const findOrCreateProductInTx = async (supplierId: string, reference: string) => {
      const trimmedRef = reference.trim();
      const products = await tx.product.findMany({
        where: { supplierId },
      });
      
      let product = products.find(
        (p) => p.reference.toLowerCase() === trimmedRef.toLowerCase()
      );

      if (!product) {
        product = await tx.product.create({
          data: {
            supplierId,
            reference: trimmedRef,
          },
        });
      }

      return product;
    };

    // Find or create customer if customerName is provided
    let customerId: string | null = input.customerId || null;
    let finalCustomerName: string | null = null;
    let finalCustomerPhone: string | null = null;
    let finalCountryCode: string | null = input.countryCode || '+34';

    if (input.customerName?.trim()) {
      // Auto-register customer if name is provided
      const customerInput: CreateCustomerInput = {
        name: input.customerName.trim(),
        phone: input.customerPhone?.trim(),
        countryCode: input.countryCode || '+34',
      };

      // Use transaction context to find or create customer
      const trimmedName = customerInput.name.trim();
      const trimmedPhone = customerInput.phone?.trim();

      // Try to find existing customer with same name and phone
      // SQLite doesn't support case-insensitive, so find all and filter
      let customer = null;
      if (trimmedPhone) {
        const allCustomers = await tx.customer.findMany({
          where: {
            phone: trimmedPhone,
          },
        });
        
        customer = allCustomers.find(
          (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
        ) || null;
      }

      if (!customer) {
        // Before creating new customer, check if phone is already assigned to another customer
        if (trimmedPhone) {
          const customersWithPhone = await tx.customer.findMany({
            where: {
              phone: trimmedPhone,
            },
          });
          
          if (customersWithPhone.length > 0) {
            // Phone is already assigned to another customer
            const customerWithPhone = customersWithPhone[0];
            throw createError(
              'PHONE_ALREADY_ASSIGNED',
              `El número de teléfono ${trimmedPhone} ya está asignado al cliente "${customerWithPhone.name}". No se puede crear un pedido con un número de teléfono que ya está en uso por otro cliente.`,
              409
            );
          }
        }
        
        // Create new customer
        const createData: any = {
          name: trimmedName,
          phone: trimmedPhone || null,
          countryCode: customerInput.countryCode || '+34',
        };
        
        // Track who created the customer
        if (userId) {
          createData.createdById = userId;
          createData.updatedById = userId; // Set updatedById on creation too
        }
        
        customer = await tx.customer.create({
          data: createData,
        });
        
        // Create audit log for customer creation (from order creation)
        if (userId) {
          try {
            await tx.customerAuditLog.create({
              data: {
                customerId: customer.id,
                userId,
                action: 'CREATE',
                metadata: JSON.stringify({
                  name: customer.name,
                  phone: customer.phone,
                  countryCode: customer.countryCode,
                  createdFrom: 'order_creation',
                }),
              },
            });
            console.log(`✅ Created audit log for customer ${customer.id} (CREATE from order)`);
          } catch (auditError: any) {
            console.error('❌ Error creating customer audit log:', auditError.message);
            console.error('   Customer ID:', customer.id);
            console.error('   User ID:', userId);
            // Don't throw - allow order creation to succeed even if audit log fails
          }
        }
      } else {
        // Update phone/countryCode if provided and different
        const fieldChanges: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
        
        if (trimmedPhone && customer.phone !== trimmedPhone) {
          fieldChanges.push({
            field: 'phone',
            oldValue: customer.phone,
            newValue: trimmedPhone,
          });
        }
        
        if (customerInput.countryCode && customer.countryCode !== customerInput.countryCode) {
          fieldChanges.push({
            field: 'countryCode',
            oldValue: customer.countryCode,
            newValue: customerInput.countryCode,
          });
        }
        
        if (fieldChanges.length > 0) {
          const updateData: any = {
            phone: trimmedPhone || customer.phone,
            countryCode: customerInput.countryCode || customer.countryCode || '+34',
            updatedAt: new Date(),
          };
          
          // Track who updated the customer
          if (userId) {
            updateData.updatedById = userId;
          }
          
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: updateData,
          });
          
          // Create audit logs for each field change (from order creation)
          if (userId && fieldChanges.length > 0) {
            for (const change of fieldChanges) {
              try {
                await tx.customerAuditLog.create({
                  data: {
                    customerId: customer.id,
                    userId,
                    action: 'UPDATE',
                    fieldChanged: change.field,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    metadata: JSON.stringify({
                      updatedFrom: 'order_creation',
                    }),
                  },
                });
                console.log(`✅ Created audit log for customer ${customer.id} (UPDATE: ${change.field} from order)`);
              } catch (auditError: any) {
                console.error('❌ Error creating customer audit log:', auditError.message);
                console.error('   Customer ID:', customer.id);
                console.error('   User ID:', userId);
                console.error('   Field:', change.field);
                // Don't throw - allow order creation to succeed even if audit log fails
              }
            }
          }
        }
      }

      customerId = customer.id;
      finalCustomerName = customer.name;
      finalCustomerPhone = customer.phone || trimmedPhone || null;
      finalCountryCode = customer.countryCode || '+34';
    } else if (input.customerId) {
      // Use provided customerId
      const customer = await tx.customer.findUnique({
        where: { id: input.customerId },
      });
      if (customer) {
        finalCustomerName = customer.name;
        finalCustomerPhone = customer.phone || input.customerPhone?.trim() || null;
        finalCountryCode = customer.countryCode || input.countryCode || '+34';
      }
    } else if (input.customerPhone?.trim()) {
      // If only phone is provided without name, store it directly
      finalCustomerPhone = input.customerPhone.trim();
    }

    // Ensure uniqueness (in case of race condition)
    let attempts = 0;
    let finalOrderNumber = orderNumber;
    let finalCounter = counter;
    
    while (await tx.order.findUnique({ where: { orderNumber: finalOrderNumber } }) && attempts < 100) {
      finalCounter++;
      if (prefix) {
        finalOrderNumber = parseInt(`${prefix}${String(finalCounter).padStart(3, '0')}`, 10);
      } else {
        finalOrderNumber = finalCounter;
      }
      attempts++;
    }
    
    if (attempts >= 100) {
      throw createError('ORDER_NUMBER_GENERATION_FAILED', 'Failed to generate unique order number', 500);
    }
    
    orderNumber = finalOrderNumber;
    
    // Create order
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerName: finalCustomerName,
        customerId: customerId || undefined,
        customerPhone: finalCustomerPhone || undefined,
        countryCode: finalCountryCode || '+34',
        observations: input.observations?.trim(),
        createdById: userId,
        status: 'PENDING',
      },
    });

    // Process suppliers and products
    const orderSuppliers: Array<{ orderId: string; supplierId: string }> = [];
    const orderProducts: Array<{
      orderId: string;
      supplierId: string;
      productRef: string;
      quantity: string;
      price: string;
    }> = [];

    for (const supplierData of input.suppliers) {
      // Find or create supplier
      let supplier;
      if (supplierData.supplierId) {
        supplier = await tx.supplier.findUnique({ where: { id: supplierData.supplierId } });
        if (!supplier) {
          throw createError('SUPPLIER_NOT_FOUND', 'Supplier not found', 404);
        }
      } else {
        supplier = await findOrCreateSupplierInTx(supplierData.name);
      }

      orderSuppliers.push({
        orderId: order.id,
        supplierId: supplier.id,
      });

      // Process products for this supplier
      for (const productData of supplierData.products) {
        // Find or create product
        let product;
        if (productData.productId) {
          product = await tx.product.findUnique({ where: { id: productData.productId } });
          if (!product) {
            throw createError('PRODUCT_NOT_FOUND', 'Product not found', 404);
          }
        } else {
          product = await findOrCreateProductInTx(supplier.id, productData.productRef);
        }

        orderProducts.push({
          orderId: order.id,
          supplierId: supplier.id,
          productRef: product.reference,
          quantity: productData.quantity.trim(),
          price: productData.price.trim(),
        });
      }
    }

    // Create order-supplier relationships
    await tx.orderSupplier.createMany({
      data: orderSuppliers,
    });

    // Create order products (only if there are any)
    if (orderProducts.length > 0) {
      await tx.orderProduct.createMany({
        data: orderProducts,
      });
    }

    // Create audit log
    await tx.auditLog.create({
      data: {
        orderId: order.id,
        userId,
        action: 'CREATE',
        metadata: JSON.stringify({
          suppliersCount: input.suppliers.length,
          productsCount: input.suppliers.reduce((sum, s) => sum + s.products.length, 0),
        }),
      },
    });

    // Return order ID to fetch after transaction commits
    return order.id;
  });

  // Update counter in config after transaction commits
  // Get the actual orderNumber that was used
  const createdOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  });
  
  if (createdOrder?.orderNumber) {
    // Extract counter from orderNumber if prefix exists
    let finalCounter = counter;
    if (prefix) {
      const orderNumberStr = String(createdOrder.orderNumber);
      if (orderNumberStr.startsWith(prefix)) {
        const counterPart = orderNumberStr.substring(prefix.length);
        finalCounter = parseInt(counterPart, 10) || counter;
      }
    } else {
      finalCounter = createdOrder.orderNumber;
    }
    
    // Update counter to the value used
    await updateConfigValue('orderCounter', String(finalCounter));
  } else {
    // Fallback: update with the counter we calculated
    await updateConfigValue('orderCounter', String(counter));
  }

  // Fetch complete order with relations after transaction commits
  return getOrderById(orderId);
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  userId: string,
  status: OrderStatus,
  notificationMethod?: string,
  cancellationReason?: string
) {
  // Extra safety: callers should already validate, but keep a runtime guard.
  if (!isOrderStatus(status)) {
    throw createError('INVALID_STATUS', 'Invalid order status', 400);
  }

  // Validate cancellation reason is required when cancelling
  if (status === 'CANCELLED' && (!cancellationReason || !cancellationReason.trim())) {
    throw createError('CANCELLATION_REASON_REQUIRED', 'Cancellation reason is required', 400);
  }

  // Get current order
  const currentOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      products: {
        select: {
          id: true,
          quantity: true,
          receivedQuantity: true,
        },
      },
    },
  });

  if (!currentOrder) {
    throw createError('ORDER_NOT_FOUND', 'Order not found', 404);
  }

  // Business rule:
  // When setting "RECEIVED" ("Pendiente de avisar"), auto-complete received quantities:
  // set each product.receivedQuantity = product.quantity (max).
  // This allows activating RECEIVED even from INCOMPLETO, while ensuring quantities are filled.
  const shouldAutoCompleteReceivedQuantities = status === 'RECEIVED';

  // Business rule:
  // "READY_TO_SEND" can only be set when the order is completed (all items fully received).
  // We define "completed" by products being fully received (calculated status = RECEIVED),
  // regardless of the current workflow stage (e.g. it may already be NOTIFIED_*).
  if (status === 'READY_TO_SEND') {
    const calculated = calculateOrderStatus(currentOrder.products as any);
    const isCompletedByProducts = calculated === 'RECEIVED';

    if (!isCompletedByProducts) {
      throw createError(
        'READY_TO_SEND_NOT_ALLOWED',
        '"Preparado para enviar" solo se puede activar cuando el pedido está completado.',
        400
      );
    }
  }

  // Business rule:
  // "SENT" can only be set when the order is currently in "READY_TO_SEND" status.
  if (status === 'SENT') {
    if (currentOrder.status !== 'READY_TO_SEND') {
      throw createError(
        'SENT_NOT_ALLOWED',
        '"Enviado" solo se puede activar cuando el pedido está en estado "Preparado para enviar".',
        400
      );
    }
  }

  // Update order in transaction
  await prisma.$transaction(async (tx) => {
    if (shouldAutoCompleteReceivedQuantities) {
      const products = Array.isArray(currentOrder.products) ? currentOrder.products : [];
      for (const p of products) {
        // Persist as TEXT (matches existing schema). Keep exactly the ordered quantity string.
        await tx.orderProduct.update({
          where: { id: (p as any).id },
          data: { receivedQuantity: (p as any).quantity ?? null },
        });
      }
    }

    // Update order
    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        notificationMethod: notificationMethod || null,
        notifiedAt: status.startsWith('NOTIFIED_') ? new Date() : undefined,
        cancellationReason: status === 'CANCELLED' ? (cancellationReason?.trim() || null) : null,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        orderId,
        userId,
        action: 'STATUS_CHANGE',
        fieldChanged: 'status',
        oldValue: currentOrder.status,
        newValue: status,
        metadata: JSON.stringify({
          notificationMethod,
          cancellationReason: status === 'CANCELLED' ? cancellationReason : undefined,
        }),
      },
    });
  });

  // Return updated order
  return getOrderById(orderId);
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          countryCode: true,
        },
      },
      suppliers: {
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      products: {
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      auditLogs: {
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw createError('ORDER_NOT_FOUND', 'Order not found', 404);
  }

  // Calculate total amount (exclude soft-deleted products)
  const totalAmount = order.products.reduce((sum, product) => {
    if (product.deletionReason) return sum;
    const quantity = parseFloat(product.quantity) || 0;
    const price = parseFloat(product.price) || 0;
    return sum + quantity * price;
  }, 0);

  return {
    ...order,
    totalAmount: totalAmount.toFixed(2),
    suppliers: order.suppliers.map((os) => ({
      id: os.supplier.id,
      name: os.supplier.name,
    })),
  };
}

/**
 * List orders with pagination and filters
 */
export async function listOrders(options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  updatedDateFrom?: string;
  updatedDateTo?: string;
  notifiedDateFrom?: string;
  notifiedDateTo?: string;
  supplierIds?: string;
  customerId?: string;
  createdById?: string;
  minAmount?: string;
  maxAmount?: string;
  minOrderNumber?: string;
  maxOrderNumber?: string;
  hasObservations?: string;
  productReference?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 50, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  const parseDateParam = (value: string, endOfDay: boolean): Date => {
    // If value is a date-only string (YYYY-MM-DD), parse it as local time to avoid timezone shifts.
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (isDateOnly) {
      const [y, m, d] = value.split('-').map((n) => parseInt(n, 10));
      const date = new Date(y, m - 1, d, 0, 0, 0, 0);
      if (endOfDay) {
        date.setHours(23, 59, 59, 999);
      }
      return date;
    }
    // Otherwise assume a full date-time string (ISO or Date.parse compatible)
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw createError('INVALID_DATE', `Invalid date: ${value}`, 400);
    }
    return date;
  };
  
  // Created date filters
  if (options.dateFrom || options.dateTo) {
    where.createdAt = {};
    if (options.dateFrom) {
      where.createdAt.gte = parseDateParam(options.dateFrom, false);
    }
    if (options.dateTo) {
      where.createdAt.lte = parseDateParam(options.dateTo, true);
    }
  }

  // Updated date filters
  if (options.updatedDateFrom || options.updatedDateTo) {
    where.updatedAt = {};
    if (options.updatedDateFrom) {
      where.updatedAt.gte = parseDateParam(options.updatedDateFrom, false);
    }
    if (options.updatedDateTo) {
      where.updatedAt.lte = parseDateParam(options.updatedDateTo, true);
    }
  }

  // Notified date filters (based on notifiedAt timestamp)
  if (options.notifiedDateFrom || options.notifiedDateTo) {
    where.notifiedAt = {};
    if (options.notifiedDateFrom) {
      where.notifiedAt.gte = parseDateParam(options.notifiedDateFrom, false);
    }
    if (options.notifiedDateTo) {
      where.notifiedAt.lte = parseDateParam(options.notifiedDateTo, true);
    }
  }

  // Search filter (SQLite doesn't support case-insensitive mode, but contains works)
  if (options.search) {
    const searchAsNumber = parseInt(options.search, 10);
    const isNumberSearch = !isNaN(searchAsNumber) && searchAsNumber.toString() === options.search.trim();
    
    where.OR = [
      { customerName: { contains: options.search } },
      { customerPhone: { contains: options.search } },
      { id: { contains: options.search } },
      ...(isNumberSearch ? [{ orderNumber: searchAsNumber }] : []),
      { products: { some: { productRef: { contains: options.search }, deletionReason: null } } },
    ];
  }

  // Status filter (supports comma-separated multiple statuses)
  if (options.status) {
    const statuses = options.status.split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      where.status = statuses[0];
    } else if (statuses.length > 1) {
      where.status = { in: statuses };
    }
  }

  // Customer filter
  if (options.customerId) {
    where.customerId = options.customerId;
  }

  // Created by filter
  if (options.createdById) {
    where.createdById = options.createdById;
  }

  // Order number range filter
  if (options.minOrderNumber || options.maxOrderNumber) {
    where.orderNumber = {};
    if (options.minOrderNumber) {
      where.orderNumber.gte = parseInt(options.minOrderNumber, 10);
    }
    if (options.maxOrderNumber) {
      where.orderNumber.lte = parseInt(options.maxOrderNumber, 10);
    }
  }

  // Observations filter
  if (options.hasObservations === 'true') {
    where.AND = [
      ...(where.AND || []),
      {
        AND: [
          { observations: { not: null } },
          { observations: { not: '' } },
        ],
      },
    ];
  } else if (options.hasObservations === 'false') {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { observations: null },
          { observations: '' },
        ],
      },
    ];
  }

  // Supplier filter - needs to be applied through OrderSupplier relation
  if (options.supplierIds) {
    const supplierIds = options.supplierIds.split(',').map(s => s.trim()).filter(Boolean);
    if (supplierIds.length > 0) {
      where.suppliers = {
        some: {
          supplierId: { in: supplierIds },
        },
      };
    }
  }

  // Product reference filter - filter orders that have at least one product with matching reference
  if (options.productReference) {
    const productRef = options.productReference.trim();
    if (productRef) {
      where.products = {
        some: {
          productRef: { contains: productRef },
        },
      };
    }
  }

  // Sorting - default to createdAt desc
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder || 'desc';
  
  // Map frontend field names to database field names
  // Note: totalAmount is computed, not a DB field, so we exclude it from direct sorting
  const sortFieldMap: Record<string, string> = {
    'status': 'status',
    'orderNumber': 'orderNumber',
    'customerName': 'customerName',
    'phone': 'customerPhone',
    'createdBy': 'createdById',
    'createdAt': 'createdAt',
    'updatedAt': 'updatedAt',
    'observations': 'observations',
  };
  
  // Validate that the sort field exists in the map (exclude computed fields like totalAmount)
  const sortField = sortFieldMap[sortBy] || 'createdAt';
  
  // Build orderBy - handle nested fields like createdBy
  let orderBy: any;
  if (sortField === 'createdById') {
    // Sort by createdBy username (requires join)
    // For now, sort by createdById (user ID), but we can enhance this later
    orderBy = { createdById: sortOrder };
  } else {
    orderBy = { [sortField]: sortOrder };
  }
  
  // For totalAmount sorting, we need to handle it differently (computed field)
  // We'll fetch orders and sort in memory if totalAmount is requested
  const shouldSortByTotalAmount = sortBy === 'totalAmount';
  
  // If sorting by totalAmount, we need to fetch all orders first, then sort and paginate in memory
  // For better performance with large datasets, we could optimize this later
  let fetchLimit = limit;
  let fetchSkip = skip;
  
  if (shouldSortByTotalAmount) {
    // When sorting by totalAmount, fetch more data to ensure accurate sorting
    // For now, fetch all orders (or a large number) then sort and paginate
    // TODO: Optimize this for large datasets (consider database-level aggregation)
    fetchLimit = 10000; // Large limit to fetch all orders for sorting
    fetchSkip = 0;
    // Use createdAt as default sort for initial fetch
    orderBy = { createdAt: 'desc' };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: fetchSkip,
      take: fetchLimit,
      orderBy,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            countryCode: true,
          },
        },
        suppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        products: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  // Format orders and apply amount filter if needed
  let formattedOrders = orders.map((order) => {
    const totalAmount = order.products.reduce((sum, product) => {
      if (product.deletionReason) return sum;
      const quantity = parseFloat(product.quantity) || 0;
      const price = parseFloat(product.price) || 0;
      return sum + quantity * price;
    }, 0);

    return {
      ...order,
      totalAmount: totalAmount.toFixed(2),
      createdBy: order.createdBy ? {
        id: order.createdBy.id,
        username: order.createdBy.username,
      } : null,
      suppliers: order.suppliers.map((os) => ({
        id: os.supplier.id,
        name: os.supplier.name,
      })),
    };
  });

  // Apply amount range filter if specified (after computing totalAmount)
  if (options.minAmount || options.maxAmount) {
    formattedOrders = formattedOrders.filter((order) => {
      const amount = parseFloat(order.totalAmount) || 0;
      const minAmount = options.minAmount ? parseFloat(options.minAmount) : 0;
      const maxAmount = options.maxAmount ? parseFloat(options.maxAmount) : Infinity;
      return amount >= minAmount && amount <= maxAmount;
    });
  }

  // If sorting by totalAmount (computed field), sort in memory
  if (shouldSortByTotalAmount) {
    formattedOrders.sort((a, b) => {
      const totalA = parseFloat(a.totalAmount) || 0;
      const totalB = parseFloat(b.totalAmount) || 0;
      
      if (sortOrder === 'asc') {
        return totalA - totalB;
      } else {
        return totalB - totalA;
      }
    });
    
    // Apply pagination after sorting
    formattedOrders = formattedOrders.slice(skip, skip + limit);
  }

  return {
    orders: formattedOrders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update an existing order
 */
export async function updateOrder(orderId: string, userId: string, input: UpdateOrderInput) {
  // Check if order exists
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!existingOrder) {
    throw createError('ORDER_NOT_FOUND', 'Order not found', 404);
  }

  // Execute transaction to update order and related data
  await prisma.$transaction(async (tx) => {
    // Helper functions for transaction context
    const findOrCreateSupplierInTx = async (name: string) => {
      const trimmedName = name.trim();
      const allSuppliers = await tx.supplier.findMany();
      let supplier = allSuppliers.find(
        (s) => s.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (!supplier) {
        supplier = await tx.supplier.create({
          data: {
            name: trimmedName,
          },
        });
      }

      return supplier;
    };

    const findOrCreateProductInTx = async (supplierId: string, reference: string) => {
      const trimmedRef = reference.trim();
      const products = await tx.product.findMany({
        where: { supplierId },
      });
      
      let product = products.find(
        (p) => p.reference.toLowerCase() === trimmedRef.toLowerCase()
      );

      if (!product) {
        product = await tx.product.create({
          data: {
            supplierId,
            reference: trimmedRef,
          },
        });
      }

      return product;
    };

    // Find or create customer if customerName is provided
    let customerId: string | null = input.customerId || existingOrder.customerId || null;
    let finalCustomerName: string | null = existingOrder.customerName;
    let finalCustomerPhone: string | null = existingOrder.customerPhone;
    let finalCountryCode: string | null = existingOrder.countryCode || '+34';

    if (input.customerName?.trim()) {
      // Auto-register customer if name is provided
      const trimmedName = input.customerName.trim();
      const trimmedPhone = input.customerPhone?.trim();

      // Try to find existing customer with same name and phone
      // SQLite doesn't support case-insensitive, so find all and filter
      let customer = null;
      if (trimmedPhone) {
        const allCustomers = await tx.customer.findMany({
          where: {
            phone: trimmedPhone,
          },
        });
        
        customer = allCustomers.find(
          (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
        ) || null;
      }

      if (!customer) {
        // Before creating new customer, check if phone is already assigned to another customer
        if (trimmedPhone) {
          const customersWithPhone = await tx.customer.findMany({
            where: {
              phone: trimmedPhone,
            },
          });
          
          if (customersWithPhone.length > 0) {
            // Phone is already assigned to another customer
            const customerWithPhone = customersWithPhone[0];
            throw createError(
              'PHONE_ALREADY_ASSIGNED',
              `El número de teléfono ${trimmedPhone} ya está asignado al cliente "${customerWithPhone.name}". No se puede actualizar el pedido con un número de teléfono que ya está en uso por otro cliente.`,
              409
            );
          }
        }
        
        // Create new customer
        const createData: any = {
          name: trimmedName,
          phone: trimmedPhone || null,
          countryCode: input.countryCode || '+34',
        };
        
        // Track who created the customer
        if (userId) {
          createData.createdById = userId;
          createData.updatedById = userId; // Set updatedById on creation too
        }
        
        customer = await tx.customer.create({
          data: createData,
        });
        
        // Create audit log for customer creation (from order update)
        if (userId) {
          try {
            await tx.customerAuditLog.create({
              data: {
                customerId: customer.id,
                userId,
                action: 'CREATE',
                metadata: JSON.stringify({
                  name: customer.name,
                  phone: customer.phone,
                  countryCode: customer.countryCode,
                  createdFrom: 'order_update',
                }),
              },
            });
            console.log(`✅ Created audit log for customer ${customer.id} (CREATE from order update)`);
          } catch (auditError: any) {
            console.error('❌ Error creating customer audit log:', auditError.message);
            console.error('   Customer ID:', customer.id);
            console.error('   User ID:', userId);
            // Don't throw - allow order update to succeed even if audit log fails
          }
        }
      } else {
        // Update phone/countryCode if provided and different
        const fieldChanges: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
        
        if (trimmedPhone && customer.phone !== trimmedPhone) {
          fieldChanges.push({
            field: 'phone',
            oldValue: customer.phone,
            newValue: trimmedPhone,
          });
        }
        
        if (input.countryCode && customer.countryCode !== input.countryCode) {
          fieldChanges.push({
            field: 'countryCode',
            oldValue: customer.countryCode,
            newValue: input.countryCode,
          });
        }
        
        if (fieldChanges.length > 0) {
          const updateData: any = {
            phone: trimmedPhone || customer.phone,
            countryCode: input.countryCode || customer.countryCode || '+34',
            updatedAt: new Date(),
          };
          
          // Track who updated the customer
          if (userId) {
            updateData.updatedById = userId;
          }
          
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: updateData,
          });
          
          // Create audit logs for each field change (from order update)
          if (userId && fieldChanges.length > 0) {
            for (const change of fieldChanges) {
              try {
                await tx.customerAuditLog.create({
                  data: {
                    customerId: customer.id,
                    userId,
                    action: 'UPDATE',
                    fieldChanged: change.field,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    metadata: JSON.stringify({
                      updatedFrom: 'order_update',
                    }),
                  },
                });
                console.log(`✅ Created audit log for customer ${customer.id} (UPDATE: ${change.field} from order update)`);
              } catch (auditError: any) {
                console.error('❌ Error creating customer audit log:', auditError.message);
                console.error('   Customer ID:', customer.id);
                console.error('   User ID:', userId);
                console.error('   Field:', change.field);
                // Don't throw - allow order update to succeed even if audit log fails
              }
            }
          }
        }
      }

      customerId = customer.id;
      finalCustomerName = customer.name;
      finalCustomerPhone = customer.phone || trimmedPhone || null;
      finalCountryCode = customer.countryCode || '+34';
    } else if (input.customerId) {
      // Use provided customerId
      const customer = await tx.customer.findUnique({
        where: { id: input.customerId },
      });
      if (customer) {
        finalCustomerName = customer.name;
        finalCustomerPhone = customer.phone || input.customerPhone?.trim() || null;
        finalCountryCode = customer.countryCode || input.countryCode || '+34';
      }
    } else if (input.customerPhone?.trim()) {
      // If only phone is provided without name, update it directly
      finalCustomerPhone = input.customerPhone.trim();
      finalCountryCode = input.countryCode || finalCountryCode;
    }

    // orderNumber cannot be updated once created
    // Handle observations: if explicitly provided (including null), update it; otherwise keep existing value
    const finalObservations = input.observations !== undefined 
      ? (input.observations?.trim() || null)
      : existingOrder.observations;
    
    const updateData: any = {
      customerName: finalCustomerName,
      customerId,
      customerPhone: finalCustomerPhone,
      countryCode: finalCountryCode,
      observations: finalObservations,
    };
    
    // Track field changes for order basic info
    const fieldChanges: Array<{
      field: string;
      oldValue: string | null;
      newValue: string | null;
      metadata?: any;
    }> = [];

    // Check customerName change
    if (existingOrder.customerName !== finalCustomerName) {
      fieldChanges.push({
        field: 'customerName',
        oldValue: existingOrder.customerName,
        newValue: finalCustomerName,
      });
    }

    // Check customerPhone change
    if (existingOrder.customerPhone !== finalCustomerPhone) {
      fieldChanges.push({
        field: 'customerPhone',
        oldValue: existingOrder.customerPhone,
        newValue: finalCustomerPhone,
      });
    }

    // Check countryCode change
    const oldCountryCode = existingOrder.countryCode || '+34';
    const newCountryCode = finalCountryCode || '+34';
    if (oldCountryCode !== newCountryCode) {
      fieldChanges.push({
        field: 'countryCode',
        oldValue: oldCountryCode,
        newValue: newCountryCode,
      });
    }

    // Check observations change
    const oldObservations = existingOrder.observations || '';
    const newObservations = input.observations !== undefined 
      ? (input.observations?.trim() || null)
      : existingOrder.observations;
    const oldObservationsForComparison = oldObservations || null;
    const newObservationsForComparison = newObservations || null;
    if (oldObservationsForComparison !== newObservationsForComparison) {
      fieldChanges.push({
        field: 'observations',
        oldValue: oldObservations || null,
        newValue: newObservations || null,
      });
    }

    // Get existing order suppliers BEFORE deletion to track supplier changes
    const existingSuppliers = await tx.orderSupplier.findMany({
      where: { orderId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get existing order products BEFORE deletion to track product changes
    const existingProducts = await tx.orderProduct.findMany({
      where: { orderId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create a map of existing suppliers by supplierId
    const existingSuppliersMap = new Map<string, string>();
    existingSuppliers.forEach((orderSupplier) => {
      existingSuppliersMap.set(orderSupplier.supplierId, orderSupplier.supplier.name);
    });

    // Create a map of existing products by supplierId + productRef for quick lookup
    const existingProductsMap = new Map<string, {
      price: string;
      quantity: string;
      receivedQuantity: string | null;
      supplierName: string;
    }>();
    existingProducts.forEach((product) => {
      const key = `${product.supplierId}|${product.productRef}`;
      existingProductsMap.set(key, {
        price: product.price,
        quantity: product.quantity,
        receivedQuantity: product.receivedQuantity,
        supplierName: product.supplier.name,
      });
    });

    // Update order basic info
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Create audit logs for field changes
    for (const change of fieldChanges) {
      await tx.auditLog.create({
        data: {
          orderId,
          userId,
          action: 'EDIT_ORDER',
          fieldChanged: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          metadata: change.metadata ? JSON.stringify(change.metadata) : null,
        },
      });
    }

    // Delete existing order-supplier and order-product relationships
    await tx.orderSupplier.deleteMany({
      where: { orderId },
    });

    await tx.orderProduct.deleteMany({
      where: { orderId },
    });

    // Process suppliers and products (similar to create)
    const orderSuppliers: Array<{ orderId: string; supplierId: string }> = [];
    const orderProducts: Array<{
      orderId: string;
      supplierId: string;
      productRef: string;
      quantity: string;
      price: string;
      receivedQuantity: string | null;
    }> = [];

    // Track new suppliers (for audit log)
    const newSupplierIds = new Set<string>();

    for (const supplierData of input.suppliers) {
      // Find or create supplier
      let supplier;
      if (supplierData.supplierId) {
        supplier = await tx.supplier.findUnique({ where: { id: supplierData.supplierId } });
        if (!supplier) {
          throw createError('SUPPLIER_NOT_FOUND', 'Supplier not found', 404);
        }
      } else {
        supplier = await findOrCreateSupplierInTx(supplierData.name);
      }

      newSupplierIds.add(supplier.id);

      // Track supplier addition/removal
      if (!existingSuppliersMap.has(supplier.id)) {
        // New supplier added
        await tx.auditLog.create({
          data: {
            orderId,
            userId,
            action: 'EDIT_ORDER',
            fieldChanged: 'supplier',
            oldValue: null,
            newValue: supplier.name,
            metadata: JSON.stringify({
              supplierId: supplier.id,
              action: 'added',
            }),
          },
        });
      }

      orderSuppliers.push({
        orderId,
        supplierId: supplier.id,
      });

      // Process products for this supplier
      for (const productData of supplierData.products) {
        // Find or create product
        let product;
        if (productData.productId) {
          product = await tx.product.findUnique({ where: { id: productData.productId } });
          if (!product) {
            throw createError('PRODUCT_NOT_FOUND', 'Product not found', 404);
          }
        } else {
          product = await findOrCreateProductInTx(supplier.id, productData.productRef);
        }

        const newPrice = productData.price.trim();
        const newQuantity = productData.quantity.trim();
        const productKey = `${supplier.id}|${product.reference}`;
        const existingProduct = existingProductsMap.get(productKey);

        // Validate: quantity cannot be less than receivedQuantity
        if (existingProduct?.receivedQuantity) {
          const received = parseFloat(existingProduct.receivedQuantity);
          const requested = parseFloat(newQuantity);
          if (!isNaN(received) && received > 0 && !isNaN(requested) && requested < received) {
            throw createError(
              'QUANTITY_BELOW_RECEIVED',
              `No se puede establecer la cantidad de "${product.reference}" (${supplier.name}) a ${newQuantity} porque ya se han recibido ${existingProduct.receivedQuantity} unidades.`,
              400
            );
          }
        }

        if (existingProduct) {
          // Product exists - track changes
          // Track price changes
          if (existingProduct.price !== newPrice) {
            await tx.auditLog.create({
              data: {
                orderId,
                userId,
                action: 'EDIT_ORDER',
                fieldChanged: 'price',
                oldValue: existingProduct.price,
                newValue: newPrice,
                metadata: JSON.stringify({
                  productRef: product.reference,
                  supplierName: supplier.name,
                  supplierId: supplier.id,
                }),
              },
            });
          }

          // Track quantity changes
          if (existingProduct.quantity !== newQuantity) {
            await tx.auditLog.create({
              data: {
                orderId,
                userId,
                action: 'EDIT_ORDER',
                fieldChanged: 'quantity',
                oldValue: existingProduct.quantity,
                newValue: newQuantity,
                metadata: JSON.stringify({
                  productRef: product.reference,
                  supplierName: supplier.name,
                  supplierId: supplier.id,
                }),
              },
            });
          }
        } else {
          // New product added
          await tx.auditLog.create({
            data: {
              orderId,
              userId,
              action: 'EDIT_ORDER',
              fieldChanged: 'product',
              oldValue: null,
              newValue: product.reference,
              metadata: JSON.stringify({
                productRef: product.reference,
                supplierName: supplier.name,
                supplierId: supplier.id,
                quantity: newQuantity,
                price: newPrice,
                action: 'added',
              }),
            },
          });
        }

        orderProducts.push({
          orderId,
          supplierId: supplier.id,
          productRef: product.reference,
          quantity: newQuantity,
          price: newPrice,
          receivedQuantity: existingProduct?.receivedQuantity ?? null,
        });
      }
    }

    // Track removed suppliers
    for (const [supplierId, supplierName] of existingSuppliersMap.entries()) {
      if (!newSupplierIds.has(supplierId)) {
        await tx.auditLog.create({
          data: {
            orderId,
            userId,
            action: 'EDIT_ORDER',
            fieldChanged: 'supplier',
            oldValue: supplierName,
            newValue: null,
            metadata: JSON.stringify({
              supplierId,
              action: 'removed',
            }),
          },
        });
      }
    }

    // Track removed products (products that existed but are not in the new list)
    // Build set of new product keys from orderProducts array
    const newProductKeys = new Set<string>();
    for (const product of orderProducts) {
      const key = `${product.supplierId}|${product.productRef}`;
      newProductKeys.add(key);
    }

    // Check for removed products
    for (const [productKey, productData] of existingProductsMap.entries()) {
      if (!newProductKeys.has(productKey)) {
        const [supplierId, productRef] = productKey.split('|');
        await tx.auditLog.create({
          data: {
            orderId,
            userId,
            action: 'EDIT_ORDER',
            fieldChanged: 'product',
            oldValue: productRef,
            newValue: null,
            metadata: JSON.stringify({
              productRef,
              supplierName: productData.supplierName,
              supplierId,
              action: 'removed',
            }),
          },
        });
      }
    }

    // Create new order-supplier relationships
    await tx.orderSupplier.createMany({
      data: orderSuppliers,
    });

    // Create new order products
    if (orderProducts.length > 0) {
      await tx.orderProduct.createMany({
        data: orderProducts,
      });
    }

    // Recalculate order status based on received quantities
    const orderWithProducts = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        products: true,
      },
    });

    if (orderWithProducts) {
      const newStatus = calculateOrderStatus(orderWithProducts.products);
      
      // Update order status if it changed
      if (newStatus !== orderWithProducts.status) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: newStatus,
          },
        });

        // Create audit log for automatic status change
        await tx.auditLog.create({
          data: {
            orderId,
            userId,
            action: 'STATUS_CHANGE',
            fieldChanged: 'status',
            oldValue: orderWithProducts.status,
            newValue: newStatus,
            metadata: JSON.stringify({
              automatic: true,
              reason: 'Order products updated - status recalculated based on received quantities',
            }),
          },
        });
      }
    }
  });

  // Return updated order
  return getOrderById(orderId);
}

/**
 * Delete order
 * Only SUPER_ADMIN can delete orders
 */
export async function deleteOrder(orderId: string, userId?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw createError('ORDER_NOT_FOUND', 'Order not found', 404);
  }

  // Delete order (cascade will handle related records)
  await prisma.order.delete({
    where: { id: orderId },
  });

  return { success: true };
}