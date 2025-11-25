import { getPrismaClient } from '../config/database';
import { createError } from '../utils/error.util';

const prisma = getPrismaClient();

export interface CreateOrderInput {
  customerName?: string;
  customerPhone: string;
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
  customerName?: string;
  customerPhone: string;
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

    // Create order
    const order = await tx.order.create({
      data: {
        customerName: input.customerName?.trim(),
        customerPhone: input.customerPhone.trim(),
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
  const validStatuses = ['PENDING', 'RECEIVED', 'NOTIFIED_CALL', 'NOTIFIED_WHATSAPP'];
  
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
}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 50, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  // Search filter (SQLite doesn't support case-insensitive mode, but contains works)
  if (options.search) {
    where.OR = [
      { customerName: { contains: options.search } },
      { customerPhone: { contains: options.search } },
      { id: { contains: options.search } },
    ];
  }

  // Status filter
  if (options.status) {
    where.status = options.status;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
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
  const formattedOrders = orders.map((order) => {
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
  });

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

    // Update order basic info
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        customerName: input.customerName?.trim(),
        customerPhone: input.customerPhone.trim(),
        observations: input.observations?.trim(),
      },
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