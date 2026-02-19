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

export interface SupplierMonthlyData {
  supplierId: string;
  supplierName: string;
  monthlyData: {
    month: string; // "YYYY-MM"
    totalAmount: number;
    orderCount: number;
  }[];
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
        strftime('%Y-%m', datetime(createdAt / 1000, 'unixepoch')) as month,
        COUNT(*) as count
      FROM orders
      WHERE createdAt IS NOT NULL
        AND createdAt >= (strftime('%s', datetime('now', '-12 months')) * 1000)
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

/**
 * Get supplier monthly assessment data
 * Returns monthly totals (amount and order count) for each supplier
 */
export async function getSupplierMonthlyData(
  year?: number,
  month?: number,
  supplierId?: string
): Promise<SupplierMonthlyData[]> {
  // Default to current year if not specified
  const targetYear = year || new Date().getFullYear();
  
  // Build where clause
  const where: any = {};
  
  // Filter by year and optionally by month - use UTC to avoid timezone issues
  let dateStart: Date;
  let dateEnd: Date;
  
  if (month !== undefined && month !== null) {
    // Filter by specific month (1-12)
    const targetMonth = Math.max(1, Math.min(12, month));
    dateStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
    // Use first moment of next month minus 1ms to include all of the last day
    dateEnd = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0) - 1);
  } else {
    // Filter by entire year
    dateStart = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
    // Use first moment of next year minus 1ms to include all of December 31st
    dateEnd = new Date(Date.UTC(targetYear + 1, 0, 1, 0, 0, 0, 0) - 1);
  }
  
  where.createdAt = {
    gte: dateStart,
    lte: dateEnd,
  };

  // Get all orders with products for the specified year
  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
      products: {
        select: {
          supplierId: true,
          quantity: true,
          price: true,
        },
      },
    },
  });

  // Get all suppliers (or specific supplier if filtered)
  const supplierWhere: any = {};
  if (supplierId) {
    supplierWhere.id = supplierId;
  }
  
  const suppliers = await prisma.supplier.findMany({
    where: supplierWhere,
    select: {
      id: true,
      name: true,
    },
  });

  // Group data by supplier and month
  const supplierDataMap = new Map<string, Map<string, { totalAmount: number; orderCount: Set<string> }>>();

  // Initialize all suppliers with months (all months if no month filter, or just the selected month)
  const monthsToInclude = month !== undefined && month !== null 
    ? [month] 
    : Array.from({ length: 12 }, (_, i) => i + 1);
  
  suppliers.forEach((supplier) => {
    const monthMap = new Map<string, { totalAmount: number; orderCount: Set<string> }>();
    monthsToInclude.forEach((m) => {
      const monthStr = `${targetYear}-${String(m).padStart(2, '0')}`;
      monthMap.set(monthStr, { totalAmount: 0, orderCount: new Set() });
    });
    supplierDataMap.set(supplier.id, monthMap);
  });

  // Process orders
  for (const order of orders) {
    const orderMonth = `${targetYear}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`;
    
    // Group products by supplier
    const orderSuppliers = new Map<string, { amount: number }>();
    
    for (const product of order.products) {
      if (!orderSuppliers.has(product.supplierId)) {
        orderSuppliers.set(product.supplierId, { amount: 0 });
      }
      const quantity = parseFloat(product.quantity || '0');
      const price = parseFloat(product.price || '0');
      orderSuppliers.get(product.supplierId)!.amount += quantity * price;
    }

    // Update supplier monthly data
    for (const [supplierId, data] of orderSuppliers.entries()) {
      const supplierMonthMap = supplierDataMap.get(supplierId);
      if (supplierMonthMap) {
        const monthData = supplierMonthMap.get(orderMonth);
        if (monthData) {
          monthData.totalAmount += data.amount;
          monthData.orderCount.add(order.id);
        }
      }
    }
  }

  // Convert to response format
  const result: SupplierMonthlyData[] = suppliers.map((supplier) => {
    const monthMap = supplierDataMap.get(supplier.id)!;
    const monthlyData = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        totalAmount: data.totalAmount,
        orderCount: data.orderCount.size,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)); // Sort by month, include all months

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      monthlyData,
    };
  }).filter((data) => data.monthlyData.length > 0); // Only include suppliers with data

  return result;
}

/**
 * Get orders count by month
 * Returns statistics of orders grouped by month
 */
export interface OrdersByMonth {
  month: string; // "YYYY-MM"
  count: number;
  year: number;
  monthNumber: number;
  monthName: string; // Localized month name
}

export async function getOrdersByMonth(
  months?: number // Number of months to include (default: all months with orders)
): Promise<OrdersByMonth[]> {
  let result: Array<{ month: string | null; count: bigint }>;

  if (months && months > 0) {
    // Get last N months - use SQLite datetime function with validated parameter
    // Validate and sanitize months value
    const monthsValue = Math.max(1, Math.min(Math.floor(months), 120)); // Limit to 1-120 months for safety
    
    // Use $queryRawUnsafe with validated parameter (safe because monthsValue is a number, not user input)
    const query = `
      SELECT 
        strftime('%Y-%m', datetime(createdAt / 1000, 'unixepoch')) as month,
        COUNT(*) as count
      FROM orders
      WHERE createdAt IS NOT NULL
        AND createdAt >= (strftime('%s', datetime('now', '-' || ${monthsValue} || ' months')) * 1000)
      GROUP BY month
      ORDER BY month DESC
    `;
    
    try {
      result = await prisma.$queryRawUnsafe<Array<{ month: string | null; count: bigint }>>(query);
    } catch (error) {
      console.error('Error executing orders-by-month query:', error);
      throw error;
    }
  } else {
    // Get all months with orders
    try {
      result = await prisma.$queryRaw<Array<{ month: string | null; count: bigint }>>`
        SELECT 
          strftime('%Y-%m', datetime(createdAt / 1000, 'unixepoch')) as month,
          COUNT(*) as count
        FROM orders
        WHERE createdAt IS NOT NULL
        GROUP BY month
        ORDER BY month DESC
      `;
    } catch (error) {
      console.error('Error executing orders-by-month query (all months):', error);
      throw error;
    }
  }

  // Format the result with year, month number, and localized month name
  // Filter out null values and format the data
  if (!result || result.length === 0) {
    return [];
  }

  return result
    .filter(
      (item): item is { month: string; count: bigint } =>
        !!item &&
        item.month !== null &&
        typeof item.month === 'string' &&
        item.month.includes('-')
    )
    .map((item) => {
      try {
        const [year, month] = item.month.split('-');
        
        // Validate year and month are valid numbers
        const yearNum = parseInt(year, 10);
        const monthNum = parseInt(month, 10);
        
        if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
          console.warn(`Invalid month format: ${item.month}`);
          return null;
        }
        
        const date = new Date(yearNum, monthNum - 1);
        
        // Validate date is valid
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date created from: ${item.month}`);
          return null;
        }
        
        return {
          month: item.month,
          count: Number(item.count),
          year: yearNum,
          monthNumber: monthNum,
          monthName: date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        };
      } catch (error) {
        console.error(`Error processing month data: ${item.month}`, error);
        return null;
      }
    })
    .filter((item) => item !== null) as OrdersByMonth[];
}

/**
 * Get total quantity ordered by product reference
 * Returns aggregated quantities for each product reference across all orders
 */
export interface QuantityByReference {
  reference: string;
  totalQuantity: number;
  orderCount: number;
  supplierName: string;
}

export async function getQuantityByReference(): Promise<QuantityByReference[]> {
  // Get all order products
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

  // Convert to array
  const products = Array.from(productMap.entries())
    .map(([key, data]) => ({
      productRef: key.split('|')[0],
      supplierId: data.supplierId,
      totalQuantity: data.quantity,
      orderCount: data.orderIds.size,
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity); // Sort by total quantity descending

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

