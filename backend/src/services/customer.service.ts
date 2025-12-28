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
export async function findOrCreateCustomer(input: CreateCustomerInput, userId?: string) {
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

    // Check if phone is already assigned to a different customer
    if (allCustomers.length > 0 && !existingCustomer) {
      // Phone exists but with different name - prevent creation
      const customerWithPhone = allCustomers[0];
      throw createError(
        'PHONE_ALREADY_ASSIGNED',
        `El número de teléfono ${input.phone.trim()} ya está asignado al cliente "${customerWithPhone.name}". No se puede crear un cliente con un número de teléfono que ya está en uso.`,
        409
      );
    }

    if (existingCustomer) {
      // Update phone/countryCode if provided and different
      if (input.countryCode || input.phone) {
        const updateData: any = {
          phone: input.phone?.trim() || existingCustomer.phone,
          countryCode: input.countryCode || existingCustomer.countryCode,
          description: input.description || existingCustomer.description,
          updatedAt: new Date(),
        };
        
        // Track who updated the customer
        if (userId) {
          updateData.updatedById = userId;
        }
        
        // Track field changes for audit log
        const fieldChanges: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
        
        if (input.phone?.trim() && existingCustomer.phone !== input.phone.trim()) {
          fieldChanges.push({
            field: 'phone',
            oldValue: existingCustomer.phone,
            newValue: input.phone.trim(),
          });
        }
        
        if (input.countryCode && existingCustomer.countryCode !== input.countryCode) {
          fieldChanges.push({
            field: 'countryCode',
            oldValue: existingCustomer.countryCode,
            newValue: input.countryCode,
          });
        }
        
        if (input.description !== undefined && existingCustomer.description !== input.description) {
          fieldChanges.push({
            field: 'description',
            oldValue: existingCustomer.description,
            newValue: input.description?.trim() || null,
          });
        }
        
        // Update customer and create audit logs in transaction
        return await prisma.$transaction(async (tx) => {
          const updatedCustomer = await tx.customer.update({
            where: { id: existingCustomer.id },
            data: updateData,
          });
          
          // Create audit logs for each field change
          if (userId && fieldChanges.length > 0) {
            for (const change of fieldChanges) {
              try {
                await tx.customerAuditLog.create({
                  data: {
                    customerId: updatedCustomer.id,
                    userId,
                    action: 'UPDATE',
                    fieldChanged: change.field,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                  },
                });
                console.log(`✅ Created audit log for customer ${updatedCustomer.id} (UPDATE: ${change.field})`);
              } catch (auditError: any) {
                console.error('❌ Error creating customer audit log:', auditError.message);
                console.error('   Customer ID:', updatedCustomer.id);
                console.error('   User ID:', userId);
                console.error('   Field:', change.field);
                // Don't throw - allow update to succeed even if audit log fails
              }
            }
          } else if (!userId) {
            console.warn('⚠️  No userId provided for customer update audit log (findOrCreateCustomer)');
          }
          
          return updatedCustomer;
        });
      }
      return existingCustomer;
    }
  }

  // Before creating new customer, check if phone is already assigned to another customer
  if (input.phone?.trim()) {
    const customersWithPhone = await prisma.customer.findMany({
      where: {
        phone: input.phone.trim(),
      },
    });
    
    if (customersWithPhone.length > 0) {
      // Phone is already assigned to another customer
      const customerWithPhone = customersWithPhone[0];
      throw createError(
        'PHONE_ALREADY_ASSIGNED',
        `El número de teléfono ${input.phone.trim()} ya está asignado al cliente "${customerWithPhone.name}". No se puede crear un cliente con un número de teléfono que ya está en uso.`,
        409
      );
    }
  }

  // Create new customer (either phone not provided, or no match found)
  const createData: any = {
    name: trimmedName,
    phone: input.phone?.trim() || null,
    countryCode: input.countryCode || '+34',
    description: input.description || null,
  };
  
  // Track who created the customer
  if (userId) {
    createData.createdById = userId;
    createData.updatedById = userId; // Set updatedById on creation too
  }
  
  // Create customer and audit log in transaction
  return await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: createData,
    });
    
    // Create audit log for customer creation
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
            }),
          },
        });
        console.log(`✅ Created audit log for customer ${customer.id} (CREATE action)`);
      } catch (auditError: any) {
        console.error('❌ Error creating customer audit log:', auditError.message);
        console.error('   Customer ID:', customer.id);
        console.error('   User ID:', userId);
        // Don't throw - allow customer creation to succeed even if audit log fails
      }
    } else {
      console.warn('⚠️  No userId provided for customer creation audit log');
    }
    
    return customer;
  });
}

/**
 * Get customer by ID
 */
export async function getCustomerById(customerId: string, includeUserInfo: boolean = false) {
  // Build include object conditionally
  const includeObj: any = {
    _count: {
      select: {
        orders: true,
      },
    },
  };
  
  if (includeUserInfo) {
    includeObj.createdBy = {
      select: {
        id: true,
        username: true,
      },
    };
    includeObj.updatedBy = {
      select: {
        id: true,
        username: true,
      },
    };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: includeObj,
  }) as any;

  if (!customer) {
    throw createError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
  }

  const result: any = {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    countryCode: customer.countryCode,
    description: customer.description,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    ordersCount: customer._count?.orders || 0,
  };
  
  // Include user info only if requested (for SUPER_ADMIN)
  if (includeUserInfo) {
    result.createdBy = customer.createdBy ? {
      id: customer.createdBy.id,
      username: customer.createdBy.username,
    } : null;
    result.updatedBy = customer.updatedBy ? {
      id: customer.updatedBy.id,
      username: customer.updatedBy.username,
    } : null;
  }

  return result;
}

/**
 * List all customers
 */
export async function listCustomers(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc', includeUserInfo: boolean = false) {
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

  // Build include object conditionally
  const includeObj: any = {
    _count: {
      select: {
        orders: true,
      },
    },
  };
  
  if (includeUserInfo) {
    includeObj.createdBy = {
      select: {
        id: true,
        username: true,
      },
    };
    includeObj.updatedBy = {
      select: {
        id: true,
        username: true,
      },
    };
  }

  const customers = await prisma.customer.findMany({
    orderBy,
    include: includeObj,
  }) as any[];

  let mappedCustomers = customers.map((c: any) => {
    const result: any = {
      id: c.id,
      name: c.name,
      phone: c.phone,
      countryCode: c.countryCode,
      description: c.description,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      ordersCount: c._count?.orders || 0,
    };
    
    // Include user info only if requested (for SUPER_ADMIN)
    if (includeUserInfo) {
      result.createdBy = c.createdBy ? {
        id: c.createdBy.id,
        username: c.createdBy.username,
      } : null;
      result.updatedBy = c.updatedBy ? {
        id: c.updatedBy.id,
        username: c.updatedBy.username,
      } : null;
    }
    
    return result;
  });

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
export async function updateCustomer(customerId: string, input: UpdateCustomerInput, userId?: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw createError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
  }

  const updateData: any = {};
  const fieldChanges: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
  
  if (input.name !== undefined && customer.name !== input.name.trim()) {
    fieldChanges.push({
      field: 'name',
      oldValue: customer.name,
      newValue: input.name.trim(),
    });
    updateData.name = input.name.trim();
  }
  
  if (input.phone !== undefined) {
    const newPhone = input.phone.trim() || null;
    if (customer.phone !== newPhone && newPhone) {
      // Check if new phone is already assigned to another customer
      const customersWithPhone = await prisma.customer.findMany({
        where: {
          phone: newPhone,
        },
      });
      
      // Filter out the current customer being updated
      const otherCustomerWithPhone = customersWithPhone.find(
        (c) => c.id !== customerId
      );
      
      if (otherCustomerWithPhone) {
        throw createError(
          'PHONE_ALREADY_ASSIGNED',
          `El número de teléfono ${newPhone} ya está asignado al cliente "${otherCustomerWithPhone.name}". No se puede asignar un número de teléfono que ya está en uso por otro cliente.`,
          409
        );
      }
      
      fieldChanges.push({
        field: 'phone',
        oldValue: customer.phone,
        newValue: newPhone,
      });
      updateData.phone = newPhone;
    } else if (!newPhone) {
      // Allow clearing phone (setting to null)
      fieldChanges.push({
        field: 'phone',
        oldValue: customer.phone,
        newValue: null,
      });
      updateData.phone = null;
    }
  }
  
  if (input.countryCode !== undefined) {
    const newCountryCode = input.countryCode || '+34';
    if (customer.countryCode !== newCountryCode) {
      fieldChanges.push({
        field: 'countryCode',
        oldValue: customer.countryCode,
        newValue: newCountryCode,
      });
      updateData.countryCode = newCountryCode;
    }
  }
  
  if (input.description !== undefined) {
    const newDescription = input.description.trim() || null;
    if (customer.description !== newDescription) {
      fieldChanges.push({
        field: 'description',
        oldValue: customer.description,
        newValue: newDescription,
      });
      updateData.description = newDescription;
    }
  }
  
  // Track who updated the customer
  if (userId) {
    updateData.updatedById = userId;
  }

  // If no changes, return existing customer
  if (fieldChanges.length === 0 && !userId) {
    return customer;
  }

  // Update customer and create audit logs in transaction
  return await prisma.$transaction(async (tx) => {
    const updatedCustomer = await tx.customer.update({
      where: { id: customerId },
      data: updateData,
    });
    
    // Create audit logs for each field change
    if (userId && fieldChanges.length > 0) {
      for (const change of fieldChanges) {
        try {
          await tx.customerAuditLog.create({
            data: {
              customerId: updatedCustomer.id,
              userId,
              action: 'UPDATE',
              fieldChanged: change.field,
              oldValue: change.oldValue,
              newValue: change.newValue,
            },
          });
          console.log(`✅ Created audit log for customer ${updatedCustomer.id} (UPDATE: ${change.field})`);
        } catch (auditError: any) {
          console.error('❌ Error creating customer audit log:', auditError.message);
          console.error('   Customer ID:', updatedCustomer.id);
          console.error('   User ID:', userId);
          console.error('   Field:', change.field);
          // Don't throw - allow update to succeed even if audit log fails
        }
      }
    } else if (!userId) {
      console.warn('⚠️  No userId provided for customer update audit log');
    } else if (fieldChanges.length === 0) {
      console.log('ℹ️  No field changes detected for customer update');
    }
    
    return updatedCustomer;
  });
}

/**
 * Delete customer
 */
export async function deleteCustomer(customerId: string, userId?: string, userRole?: 'SUPER_ADMIN' | 'USER') {
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

  // Only SUPER_ADMIN can delete customers with orders
  if (customer._count.orders > 0 && userRole !== 'SUPER_ADMIN') {
    throw createError('CUSTOMER_HAS_ORDERS', 'Cannot delete customer with existing orders', 400);
  }

  // Delete customer and create audit log in transaction
  await prisma.$transaction(async (tx) => {
    // Create audit log before deletion
    if (userId) {
      try {
        await tx.customerAuditLog.create({
          data: {
            customerId: customer.id,
            userId,
            action: 'DELETE',
            metadata: JSON.stringify({
              name: customer.name,
              phone: customer.phone,
              countryCode: customer.countryCode,
            }),
          },
        });
        console.log(`✅ Created audit log for customer ${customer.id} (DELETE action)`);
      } catch (auditError: any) {
        console.error('❌ Error creating customer audit log:', auditError.message);
        console.error('   Customer ID:', customer.id);
        console.error('   User ID:', userId);
        // Don't throw - allow deletion to proceed even if audit log fails
      }
    } else {
      console.warn('⚠️  No userId provided for customer deletion audit log');
    }
    
    // Delete customer (this will cascade delete audit logs, but we want to keep them)
    // Actually, we should keep audit logs even after deletion, so we'll delete manually
    await tx.customer.delete({
      where: { id: customerId },
    });
  });

  return { success: true };
}

/**
 * Get customer audit logs (history)
 * Can retrieve logs even if customer was deleted (customerId will be null)
 */
export async function getCustomerAuditLogs(customerId: string) {
  const auditLogs = await prisma.customerAuditLog.findMany({
    where: { customerId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });

  return auditLogs.map((log) => ({
    id: log.id,
    customerId: log.customerId,
    userId: log.userId,
    user: log.user,
    action: log.action,
    fieldChanged: log.fieldChanged,
    oldValue: log.oldValue,
    newValue: log.newValue,
    timestamp: log.timestamp,
    metadata: log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : null,
  }));
}

