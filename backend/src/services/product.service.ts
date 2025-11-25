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
export async function listProducts(supplierId?: string) {
  const where: any = {};
  
  if (supplierId) {
    where.supplierId = supplierId;
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { reference: 'asc' },
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

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
      (p) => p.id !== productId && p.reference.toLowerCase() === input.reference.trim().toLowerCase()
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

