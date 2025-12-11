import { getPrismaClient } from '../config/database';

const prisma = getPrismaClient();

export interface TopProduct {
  reference: string;
  totalQuantity: number;
  orderCount: number;
  supplierName: string;
}

export interface TopCustomer {
  customerId: string;
  customerName: string;
  orderCount: number;
  totalAmount: number;
}

export interface OrderStatistics {
  totalOrders: number;
  ordersByStatus: {
    status: string;
    count: number;
  }[];
  ordersByMonth: {
    month: string;
    count: number;
  }[];
  averageOrderValue: number;
}

/**
 * Get top products (most requested references) by quantity
 */
export async function getTopProducts(limit: number = 10): Promise<TopProduct[]> {
  // Since quantity is stored as String, we need to fetch all and aggregate manually
  const orderProducts = await prisma.orderProduct.findMany({
    select: {
      productRef: true,
      supplierId: true,
      quantity: true,
      orderId: true,
    },
  });

  // Group by productRef and supplierId, sum quantities
  const productMap = new Map<string, { quantity: number; orderIds: Set<string>; supplierId: string }>();

  for (const op of orderProducts) {
    const key = `${op.productRef}|${op.supplierId}`;
    if (!productMap.has(key)) {
      productMap.set(key, {
        quantity: 0,
        orderIds: new Set(),
        supplierId: op.supplierId,
      });
    }
    const product = productMap.get(key)!;
    product.quantity += parseFloat(op.quantity || '0');
    product.orderIds.add(op.orderId);
  }

  // Convert to array and sort
  const products = Array.from(productMap.entries())
    .map(([key, data]) => ({
      productRef: key.split('|')[0],
      supplierId: data.supplierId,
      totalQuantity: data.quantity,
      orderCount: data.orderIds.size,
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, limit);

  // Get supplier names
  const supplierIds = [...new Set(products.map((p) => p.supplierId))];
  const suppliers = await prisma.supplier.findMany({
    where: {
      id: {
        in: supplierIds,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

  return products.map((p) => ({
    reference: p.productRef,
    totalQuantity: p.totalQuantity,
    orderCount: p.orderCount,
    supplierName: supplierMap.get(p.supplierId) || 'Unknown',
  }));
}

/**
 * Get top customers (customers who order the most)
 */
export async function getTopCustomers(limit: number = 10): Promise<TopCustomer[]> {
  // Group orders by customer (using customerId if available, otherwise customerName)
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { customerId: { not: null } },
        { customerName: { not: null } },
      ],
    },
    select: {
      id: true,
      customerId: true,
      customerName: true,
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      products: {
        select: {
          quantity: true,
          price: true,
        },
      },
    },
  });

  // Group by customer
  const customerMap = new Map<string, { name: string; orderCount: number; totalAmount: number }>();

  for (const order of orders) {
    const customerId = order.customerId || `name:${order.customerName}`;
    const customerName = order.customer?.name || order.customerName || 'Unknown';

    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        name: customerName,
        orderCount: 0,
        totalAmount: 0,
      });
    }

    const customer = customerMap.get(customerId)!;
    customer.orderCount++;
    
    // Calculate order total from products
    const orderTotal = order.products.reduce((sum, product) => {
      const quantity = parseFloat(product.quantity || '0');
      const price = parseFloat(product.price || '0');
      return sum + (quantity * price);
    }, 0);
    customer.totalAmount += orderTotal;
  }

  // Convert to array and sort by order count
  const customers = Array.from(customerMap.entries())
    .map(([customerId, data]) => ({
      customerId,
      customerName: data.name,
      orderCount: data.orderCount,
      totalAmount: data.totalAmount,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, limit);

  return customers;
}

/**
 * Get order statistics
 */
export async function getOrderStatistics(): Promise<OrderStatistics> {
  const [totalOrders, ordersByStatus, ordersByMonth, ordersWithProducts] = await Promise.all([
    prisma.order.count(),
    prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    }),
    prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT 
        strftime('%Y-%m', createdAt) as month,
        COUNT(*) as count
      FROM orders
      WHERE createdAt >= datetime('now', '-12 months')
      GROUP BY month
      ORDER BY month DESC
    `,
    prisma.order.findMany({
      select: {
        id: true,
        products: {
          select: {
            quantity: true,
            price: true,
          },
        },
      },
    }),
  ]);

  // Calculate total amount from products
  const totalAmount = ordersWithProducts.reduce((sum, order) => {
    const orderTotal = order.products.reduce((productSum, product) => {
      const quantity = parseFloat(product.quantity || '0');
      const price = parseFloat(product.price || '0');
      return productSum + (quantity * price);
    }, 0);
    return sum + orderTotal;
  }, 0);
  
  const averageOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;

  return {
    totalOrders,
    ordersByStatus: ordersByStatus.map((item) => ({
      status: item.status,
      count: item._count.id,
    })),
    ordersByMonth: ordersByMonth.map((item) => ({
      month: item.month as string,
      count: Number(item.count),
    })),
    averageOrderValue,
  };
}

