import { getPrismaClient } from '../config/database';
import { createError } from '../utils/error.util';

const prisma = getPrismaClient();

export interface CreateSupplierInput {
  name: string;
  description?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  description?: string;
}

/**
 * List all suppliers
 */
export async function listSuppliers(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc') {
  // Map frontend sort keys to database fields
  const sortFieldMap: Record<string, string> = {
    name: 'name',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    productsCount: 'productsCount', // Will be sorted in memory
    ordersCount: 'ordersCount', // Will be sorted in memory
  };

  const sortField = sortBy && sortFieldMap[sortBy] ? sortFieldMap[sortBy] : 'name';
  
  // For computed fields, we'll sort in memory
  const isComputedField = sortField === 'productsCount' || sortField === 'ordersCount';
  
  let orderBy: any = { [sortField]: sortOrder };
  if (isComputedField) {
    orderBy = { name: 'asc' }; // Default sort, will override in memory
  }

  const suppliers = await prisma.supplier.findMany({
    orderBy,
    include: {
      _count: {
        select: {
          products: true,
          orderSuppliers: true,
        },
      },
    },
  });

  let mappedSuppliers = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    productsCount: s._count.products,
    ordersCount: s._count.orderSuppliers,
  }));

  // Sort computed fields in memory
  if (isComputedField) {
    mappedSuppliers.sort((a, b) => {
      const aValue = sortField === 'productsCount' ? a.productsCount : a.ordersCount;
      const bValue = sortField === 'productsCount' ? b.productsCount : b.ordersCount;
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }

  return mappedSuppliers;
}

/**
 * Get supplier by ID
 */
export async function getSupplierById(supplierId: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      _count: {
        select: {
          products: true,
          orderSuppliers: true,
        },
      },
    },
  });

  if (!supplier) {
    throw createError('SUPPLIER_NOT_FOUND', 'Supplier not found', 404);
  }

  return {
    id: supplier.id,
    name: supplier.name,
    description: supplier.description,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
    productsCount: supplier._count.products,
    ordersCount: supplier._count.orderSuppliers,
  };
}

/**
 * Create a new supplier
 */
export async function createSupplier(input: CreateSupplierInput) {
  // Check if supplier with same name already exists (case-insensitive)
  const existingSuppliers = await prisma.supplier.findMany();
  const exists = existingSuppliers.some(
    (s) => s.name.toLowerCase() === input.name.trim().toLowerCase()
  );

  if (exists) {
    throw createError('SUPPLIER_EXISTS', 'Supplier with this name already exists', 400);
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim(),
    },
  });

  return supplier;
}

/**
 * Update supplier
 */
export async function updateSupplier(supplierId: string, input: UpdateSupplierInput) {
  // Check if supplier exists
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
  });

  if (!supplier) {
    throw createError('SUPPLIER_NOT_FOUND', 'Supplier not found', 404);
  }

  // Check if name is being changed and if it conflicts
  if (input.name && input.name.trim().toLowerCase() !== supplier.name.toLowerCase()) {
    const existingSuppliers = await prisma.supplier.findMany();
    const exists = existingSuppliers.some(
      (s) => s.id !== supplierId && s.name.toLowerCase() === (input.name?.trim().toLowerCase() ?? '')
    );

    if (exists) {
      throw createError('SUPPLIER_EXISTS', 'Supplier with this name already exists', 400);
    }
  }

  const updateData: any = {};

  if (input.name !== undefined) {
    updateData.name = input.name.trim();
  }

  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null;
  }

  const updatedSupplier = await prisma.supplier.update({
    where: { id: supplierId },
    data: updateData,
  });

  return updatedSupplier;
}

/**
 * Delete supplier
 */
export async function deleteSupplier(supplierId: string) {
  // Check if supplier exists
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      _count: {
        select: {
          orderSuppliers: true,
        },
      },
    },
  });

  if (!supplier) {
    throw createError('SUPPLIER_NOT_FOUND', 'Supplier not found', 404);
  }

  // Check if supplier has orders (products can be deleted with cascade)
  if (supplier._count.orderSuppliers > 0) {
    throw createError(
      'SUPPLIER_HAS_ORDERS',
      'Cannot delete supplier that has orders. Remove all orders first.',
      400
    );
  }

  await prisma.supplier.delete({
    where: { id: supplierId },
  });

  return { success: true };
}

