import { getPrismaClient } from '../config/database';
import { createError } from '../utils/error.util';

const prisma = getPrismaClient();

export interface CreateProductInput {
  supplierId: string;
  reference: string;
  description?: string;
  defaultPrice?: string;
}

export interface UpdateProductInput {
  reference?: string;
  description?: string;
  defaultPrice?: string;
}

/**
 * List products (optionally filtered by supplier)
 */
export async function listProducts(supplierId?: string, sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc') {
  const where: any = {};
  
  if (supplierId) {
    where.supplierId = supplierId;
  }

  // Map frontend sort keys to database fields
  const sortFieldMap: Record<string, string> = {
    reference: 'reference',
    supplier: 'supplier', // Will be sorted in memory
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  };

  const sortField = sortBy && sortFieldMap[sortBy] ? sortFieldMap[sortBy] : 'reference';
  
  // For supplier name sorting, we'll sort in memory
  const isComputedField = sortField === 'supplier';
  
  let orderBy: any = { [sortField]: sortOrder };
  if (isComputedField) {
    orderBy = { reference: 'asc' }; // Default sort, will override in memory
  }

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Sort by supplier name in memory if needed
  if (isComputedField) {
    products.sort((a, b) => {
      const aValue = a.supplier.name.toLowerCase();
      const bValue = b.supplier.name.toLowerCase();
      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }

  return products;
}

/**
 * Get product by ID
 */
export async function getProductById(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!product) {
    throw createError('PRODUCT_NOT_FOUND', 'Product not found', 404);
  }

  return product;
}

/**
 * Create a new product
 */
export async function createProduct(input: CreateProductInput) {
  // Check if supplier exists
  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
  });

  if (!supplier) {
    throw createError('SUPPLIER_NOT_FOUND', 'Supplier not found', 404);
  }

  // Check if product with same reference already exists for this supplier (case-insensitive)
  const existingProducts = await prisma.product.findMany({
    where: { supplierId: input.supplierId },
  });

  const exists = existingProducts.some(
    (p) => p.reference.toLowerCase() === input.reference.trim().toLowerCase()
  );

  if (exists) {
    throw createError(
      'PRODUCT_EXISTS',
      'Product with this reference already exists for this supplier',
      400
    );
  }

  const product = await prisma.product.create({
    data: {
      supplierId: input.supplierId,
      reference: input.reference.trim(),
      description: input.description?.trim(),
      defaultPrice: input.defaultPrice?.trim(),
    },
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return product;
}

/**
 * Update product
 */
export async function updateProduct(productId: string, input: UpdateProductInput) {
  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw createError('PRODUCT_NOT_FOUND', 'Product not found', 404);
  }

  // Check if reference is being changed and if it conflicts
  if (input.reference && input.reference.trim().toLowerCase() !== product.reference.toLowerCase()) {
    const existingProducts = await prisma.product.findMany({
      where: { supplierId: product.supplierId },
    });

    const exists = existingProducts.some(
      (p) => p.id !== productId && p.reference.toLowerCase() === (input.reference?.trim().toLowerCase() ?? '')
    );

    if (exists) {
      throw createError(
        'PRODUCT_EXISTS',
        'Product with this reference already exists for this supplier',
        400
      );
    }
  }

  const updateData: any = {};

  if (input.reference !== undefined) {
    updateData.reference = input.reference.trim();
  }

  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null;
  }

  if (input.defaultPrice !== undefined) {
    updateData.defaultPrice = input.defaultPrice?.trim() || null;
  }

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: updateData,
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updatedProduct;
}

/**
 * Delete product
 */
export async function deleteProduct(productId: string) {
  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw createError('PRODUCT_NOT_FOUND', 'Product not found', 404);
  }

  // Note: Products can be deleted even if they're in orders
  // because order products store the reference separately
  await prisma.product.delete({
    where: { id: productId },
  });

  return { success: true };
}

export interface PendingProduct {
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

/**
 * Get pending products (products that haven't been fully received)
 * A product is pending if receivedQuantity is null or receivedQuantity < quantity
 */
export async function getPendingProducts(): Promise<PendingProduct[]> {
  // Get all order products with their orders and customer info
  const allOrderProducts = await prisma.orderProduct.findMany({
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerId: true,
          customerPhone: true,
          status: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  
  // Filter to only include pending products (where receivedQuantity < quantity)
  const pendingProducts: PendingProduct[] = [];
  
  // Get all unique product references to batch fetch descriptions
  const productRefs = new Set<string>();
  const supplierIds = new Set<string>();
  for (const op of allOrderProducts) {
    const quantity = parseFloat(op.quantity || '0');
    const receivedQuantity = op.receivedQuantity ? parseFloat(op.receivedQuantity) : 0;
    if (quantity > receivedQuantity) {
      productRefs.add(op.productRef);
      supplierIds.add(op.supplierId);
    }
  }
  
  // Batch fetch product descriptions
  const products = await prisma.product.findMany({
    where: {
      supplierId: { in: Array.from(supplierIds) },
      reference: { in: Array.from(productRefs) },
    },
    select: {
      supplierId: true,
      reference: true,
      description: true,
    },
  });
  
  // Create a map for quick lookup
  const productDescriptionMap = new Map<string, string | null>();
  for (const product of products) {
    const key = `${product.supplierId}|${product.reference}`;
    productDescriptionMap.set(key, product.description);
  }
  
  // Process order products and build pending products list
  for (const op of allOrderProducts) {
    const quantity = parseFloat(op.quantity || '0');
    const receivedQuantity = op.receivedQuantity ? parseFloat(op.receivedQuantity) : 0;
    const pendingQuantity = quantity - receivedQuantity;
    
    // Only include if there's still pending quantity
    if (pendingQuantity > 0) {
      const productKey = `${op.supplierId}|${op.productRef}`;
      const productDescription = productDescriptionMap.get(productKey) || null;
      
      pendingProducts.push({
        id: op.id,
        orderId: op.orderId,
        orderNumber: op.order.orderNumber,
        productRef: op.productRef,
        supplierId: op.supplierId,
        supplierName: op.supplier.name,
        quantity: op.quantity,
        receivedQuantity: op.receivedQuantity,
        pendingQuantity,
        customerName: op.order.customerName,
        customerId: op.order.customerId,
        customerPhone: op.order.customerPhone,
        orderStatus: op.order.status,
        productDescription,
        createdAt: op.order.createdAt ? op.order.createdAt.toISOString() : undefined,
        createdBy: op.order.createdBy ? {
          id: op.order.createdBy.id,
          username: op.order.createdBy.username,
        } : null,
      });
    }
  }
  
  // Sort by order number (newest first) then by supplier name, then by product reference
  pendingProducts.sort((a, b) => {
    // First by order number (descending - newest first)
    if (a.orderNumber !== b.orderNumber) {
      return (b.orderNumber || 0) - (a.orderNumber || 0);
    }
    // Then by supplier name
    if (a.supplierName !== b.supplierName) {
      return a.supplierName.localeCompare(b.supplierName);
    }
    // Then by product reference
    return a.productRef.localeCompare(b.productRef);
  });
  
  return pendingProducts;
}

