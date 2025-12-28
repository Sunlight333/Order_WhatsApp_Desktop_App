import { Request, Response, NextFunction } from 'express';
import {
  listCustomers,
  getCustomerById,
  searchCustomers,
  findOrCreateCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerAuditLogs,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '../services/customer.service';
import { createSuccessResponse } from '../utils/response.util';

/**
 * GET /api/v1/customers/search
 * Search customers by name (for autocomplete/hint text)
 */
export async function searchCustomersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q, limit } = req.query;
    const customers = await searchCustomers({
      query: q as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.status(200).json(createSuccessResponse(customers));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/customers
 * List all customers
 */
export async function listCustomersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
    // Only SUPER_ADMIN can see user traceability info
    const includeUserInfo = req.user?.role === 'SUPER_ADMIN';
    const customers = await listCustomers(sortBy, sortOrder, includeUserInfo);
    res.status(200).json(createSuccessResponse(customers));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/customers/:id
 * Get customer by ID
 */
export async function getCustomerController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    // Only SUPER_ADMIN can see user traceability info
    const includeUserInfo = req.user?.role === 'SUPER_ADMIN';
    const customer = await getCustomerById(id, includeUserInfo);
    res.status(200).json(createSuccessResponse(customer));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/customers
 * Create a new customer (or find existing)
 */
export async function createCustomerController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const validatedData: CreateCustomerInput = {
      name: req.body.name?.trim(),
      phone: req.body.phone?.trim(),
      countryCode: req.body.countryCode || '+34',
      description: req.body.description?.trim(),
    };

    if (!validatedData.name) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Customer name is required',
        },
      });
      return;
    }

    const userId = req.user?.userId;
    const customer = await findOrCreateCustomer(validatedData, userId);
    res.status(201).json(createSuccessResponse(customer, 'Customer created successfully'));
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/customers/:id
 * Update customer
 */
export async function updateCustomerController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { id } = req.params;
    const userId = req.user?.userId;
    const validatedData: UpdateCustomerInput = {
      name: req.body.name?.trim(),
      phone: req.body.phone?.trim(),
      countryCode: req.body.countryCode,
      description: req.body.description?.trim(),
    };

    const customer = await updateCustomer(id, validatedData, userId);
    res.status(200).json(createSuccessResponse(customer, 'Customer updated successfully'));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/customers/:id
 * Delete customer
 */
export async function deleteCustomerController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    await deleteCustomer(id, userId, userRole);
    res.status(200).json(createSuccessResponse(null, 'Customer deleted successfully'));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/customers/:id/audit-logs
 * Get customer audit logs (history) - Only SUPER_ADMIN
 */
export async function getCustomerAuditLogsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Only SUPER_ADMIN can view audit logs
    if (req.user.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can view audit logs',
        },
      });
      return;
    }

    const { id } = req.params;
    const auditLogs = await getCustomerAuditLogs(id);
    res.status(200).json(createSuccessResponse(auditLogs));
  } catch (error) {
    next(error);
  }
}

