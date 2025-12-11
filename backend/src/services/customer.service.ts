import { getPrismaClient } from '../config/database';
import { createError } from '../utils/error.util';

const prisma = getPrismaClient();

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  countryCode?: string;
  description?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  countryCode?: string;
  description?: string;
}

export interface SearchCustomersOptions {
  query?: string;
  limit?: number;
}

/**
 * Search customers by name (for autocomplete/hint text)
 */
export async function searchCustomers(options: SearchCustomersOptions = {}) {
  const { query = '', limit = 20 } = options;
  
  // SQLite doesn't support case-insensitive mode, so we'll filter in JavaScript
  // But we still use contains for basic filtering
  const where = query.trim()
    ? {
        name: {
          contains: query,
        },
      }
    : {};

  const customers = await prisma.customer.findMany({
    where: {},
    orderBy: [
      { name: 'asc' },
      { createdAt: 'desc' },
    ],
    take: limit * 2, // Get more to filter case-insensitively
    select: {
      id: true,
      name: true,
      phone: true,
      countryCode: true,
      description: true,
    },
  });

  // Filter case-insensitively in JavaScript (SQLite doesn't support it)
  const filtered = query.trim()
    ? customers.filter((c) => 
        c.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit)
    : customers.slice(0, limit);

  return filtered;
}

/**
 * Find or create a customer
 * Handles duplicate names by checking if customer with same name and phone exists
 * If phone is not provided, creates new customer even if name exists
 */
export async function findOrCreateCustomer(input: CreateCustomerInput) {
  const trimmedName = input.name.trim();
  
  if (!trimmedName) {
    throw createError('INVALID_INPUT', 'Customer name is required', 400);
  }

  // If phone is provided, try to find existing customer with same name and phone
  if (input.phone?.trim()) {
    // SQLite doesn't support case-insensitive, so find all and filter
    const allCustomers = await prisma.customer.findMany({
      where: {
        phone: input.phone.trim(),
      },
    });
    
    const existingCustomer = allCustomers.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingCustomer) {
      // Update phone/countryCode if provided and different
      if (input.countryCode || input.phone) {
        return await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            phone: input.phone?.trim() || existingCustomer.phone,
            countryCode: input.countryCode || existingCustomer.countryCode,
            description: input.description || existingCustomer.description,
            updatedAt: new Date(),
          },
        });
      }
      return existingCustomer;
    }
  }

  // Create new customer (either phone not provided, or no match found)
  return await prisma.customer.create({
    data: {
      name: trimmedName,
      phone: input.phone?.trim() || null,
      countryCode: input.countryCode || '+34',
      description: input.description || null,
    },
  });
}

/**
 * Get customer by ID
 */
export async function getCustomerById(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  if (!customer) {
    throw createError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
  }

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    countryCode: customer.countryCode,
    description: customer.description,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    ordersCount: customer._count.orders,
  };
}

/**
 * List all customers
 */
export async function listCustomers(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc') {
  // Map frontend sort keys to database fields
  const sortFieldMap: Record<string, string> = {
    name: 'name',
    phone: 'phone',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    ordersCount: 'ordersCount', // Will be sorted in memory
  };

  const sortField = sortBy && sortFieldMap[sortBy] ? sortFieldMap[sortBy] : 'name';
  
  // For computed fields, we'll sort in memory
  const isComputedField = sortField === 'ordersCount';
  
  let orderBy: any = { [sortField]: sortOrder };
  if (isComputedField) {
    orderBy = { name: 'asc' }; // Default sort, will override in memory
  }

  const customers = await prisma.customer.findMany({
    orderBy,
    include: {
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  let mappedCustomers = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    countryCode: c.countryCode,
    description: c.description,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    ordersCount: c._count.orders,
  }));

  // Sort computed fields in memory
  if (isComputedField) {
    mappedCustomers.sort((a, b) => {
      return sortOrder === 'asc' ? a.ordersCount - b.ordersCount : b.ordersCount - a.ordersCount;
    });
  }

  return mappedCustomers;
}

/**
 * Update customer
 */
export async function updateCustomer(customerId: string, input: UpdateCustomerInput) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw createError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
  }

  const updateData: any = {};
  
  if (input.name !== undefined) {
    updateData.name = input.name.trim();
  }
  if (input.phone !== undefined) {
    updateData.phone = input.phone.trim() || null;
  }
  if (input.countryCode !== undefined) {
    updateData.countryCode = input.countryCode || '+34';
  }
  if (input.description !== undefined) {
    updateData.description = input.description.trim() || null;
  }

  return await prisma.customer.update({
    where: { id: customerId },
    data: updateData,
  });
}

/**
 * Delete customer
 */
export async function deleteCustomer(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  if (!customer) {
    throw createError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
  }

  if (customer._count.orders > 0) {
    throw createError('CUSTOMER_HAS_ORDERS', 'Cannot delete customer with existing orders', 400);
  }

  await prisma.customer.delete({
    where: { id: customerId },
  });

  return { success: true };
}

