import { getPrismaClient } from '../config/database';
import { createError } from '../utils/error.util';
import { findOrCreateCustomer, CreateCustomerInput } from './customer.service';

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

/**
 * Create a new order
 */
export async function createOrder(userId: string, input: CreateOrderInput) {
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
        // Create new customer
        customer = await tx.customer.create({
          data: {
            name: trimmedName,
            phone: trimmedPhone || null,
            countryCode: customerInput.countryCode || '+34',
          },
        });
      } else {
        // Update phone/countryCode if provided and different
        if (trimmedPhone && customer.phone !== trimmedPhone) {
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: {
              phone: trimmedPhone,
              countryCode: customerInput.countryCode || customer.countryCode || '+34',
              updatedAt: new Date(),
            },
          });
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

    // Generate orderNumber (auto-incremental, starting from 1)
    // Get the maximum orderNumber from existing orders
    const maxOrder = await tx.order.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    
    // Calculate next order number (start from 1 if no orders exist)
    let orderNumber = 1;
    if (maxOrder?.orderNumber) {
      orderNumber = maxOrder.orderNumber + 1;
    }
    
    // Ensure uniqueness (in case of race condition)
    let attempts = 0;
    while (await tx.order.findUnique({ where: { orderNumber } }) && attempts < 100) {
      orderNumber++;
      attempts++;
    }
    
    if (attempts >= 100) {
      throw createError('ORDER_NUMBER_GENERATION_FAILED', 'Failed to generate unique order number', 500);
    }
    
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

  // Fetch complete order with relations after transaction commits
  return getOrderById(orderId);
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  userId: string,
  status: string,
  notificationMethod?: string
) {
  const validStatuses = ['PENDING', 'RECEIVED', 'NOTIFIED_CALL', 'NOTIFIED_WHATSAPP', 'CANCELLED', 'INCOMPLETO'];
  
  if (!validStatuses.includes(status)) {
    throw createError('INVALID_STATUS', 'Invalid order status', 400);
  }

  // Get current order
  const currentOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!currentOrder) {
    throw createError('ORDER_NOT_FOUND', 'Order not found', 404);
  }

  // Update order in transaction
  await prisma.$transaction(async (tx) => {
    // Update order
    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        notificationMethod: notificationMethod || null,
        notifiedAt: status.startsWith('NOTIFIED_') ? new Date() : undefined,
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

  // Calculate total amount
  const totalAmount = order.products.reduce((sum, product) => {
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
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 50, 100);
  const skip = (page - 1) * limit;

  const where: any = {};
  
  // Date filters
  if (options.dateFrom || options.dateTo) {
    where.createdAt = {};
    if (options.dateFrom) {
      where.createdAt.gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      // Add one day to include the entire end date
      const endDate = new Date(options.dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }

  // Search filter (SQLite doesn't support case-insensitive mode, but contains works)
  if (options.search) {
    // Try to parse search as number for orderNumber search
    const searchAsNumber = parseInt(options.search, 10);
    const isNumberSearch = !isNaN(searchAsNumber) && searchAsNumber.toString() === options.search.trim();
    
    where.OR = [
      { customerName: { contains: options.search } },
      { customerPhone: { contains: options.search } },
      { id: { contains: options.search } },
      ...(isNumberSearch ? [{ orderNumber: searchAsNumber }] : []),
    ];
  }

  // Status filter
  if (options.status) {
    where.status = options.status;
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

  // Format orders
  let formattedOrders = orders.map((order) => {
    const totalAmount = order.products.reduce((sum, product) => {
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
        // Create new customer
        customer = await tx.customer.create({
          data: {
            name: trimmedName,
            phone: trimmedPhone || null,
            countryCode: input.countryCode || '+34',
          },
        });
      } else {
        // Update phone/countryCode if provided and different
        if (trimmedPhone && customer.phone !== trimmedPhone) {
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: {
              phone: trimmedPhone,
              countryCode: input.countryCode || customer.countryCode || '+34',
              updatedAt: new Date(),
            },
          });
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
    const updateData: any = {
      customerName: finalCustomerName,
      customerId,
      customerPhone: finalCustomerPhone,
      countryCode: finalCountryCode,
      observations: input.observations?.trim(),
    };
    
    // Update order basic info
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: updateData,
    });

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

        orderProducts.push({
          orderId,
          supplierId: supplier.id,
          productRef: product.reference,
          quantity: productData.quantity.trim(),
          price: productData.price.trim(),
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

    // Create audit log
    await tx.auditLog.create({
      data: {
        orderId,
        userId,
        action: 'UPDATE',
        metadata: JSON.stringify({
          suppliersCount: input.suppliers.length,
          productsCount: input.suppliers.reduce((sum, s) => sum + s.products.length, 0),
        }),
      },
    });
  });

  // Return updated order
  return getOrderById(orderId);
}