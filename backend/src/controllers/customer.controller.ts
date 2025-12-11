import { Request, Response } from 'express';
import {
  listCustomers,
  getCustomerById,
  searchCustomers,
  findOrCreateCustomer,
  updateCustomer,
  deleteCustomer,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '../services/customer.service';
import { createSuccessResponse } from '../utils/response.util';

/**
 * GET /api/v1/customers/search
 * Search customers by name (for autocomplete/hint text)
 */
export async function searchCustomersController(req: Request, res: Response): Promise<void> {
  try {
    const { q, limit } = req.query;
    const customers = await searchCustomers({
      query: q as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.status(200).json(createSuccessResponse(customers));
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/v1/customers
 * List all customers
 */
export async function listCustomersController(req: Request, res: Response): Promise<void> {
  try {
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
    const customers = await listCustomers(sortBy, sortOrder);
    res.status(200).json(createSuccessResponse(customers));
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/v1/customers/:id
 * Get customer by ID
 */
export async function getCustomerController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const customer = await getCustomerById(id);
    res.status(200).json(createSuccessResponse(customer));
  } catch (error) {
    throw error;
  }
}

/**
 * POST /api/v1/customers
 * Create a new customer (or find existing)
 */
export async function createCustomerController(req: Request, res: Response): Promise<void> {
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

    const customer = await findOrCreateCustomer(validatedData);
    res.status(201).json(createSuccessResponse(customer, 'Customer created successfully'));
  } catch (error) {
    throw error;
  }
}

/**
 * PUT /api/v1/customers/:id
 * Update customer
 */
export async function updateCustomerController(req: Request, res: Response): Promise<void> {
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
    const validatedData: UpdateCustomerInput = {
      name: req.body.name?.trim(),
      phone: req.body.phone?.trim(),
      countryCode: req.body.countryCode,
      description: req.body.description?.trim(),
    };

    const customer = await updateCustomer(id, validatedData);
    res.status(200).json(createSuccessResponse(customer, 'Customer updated successfully'));
  } catch (error) {
    throw error;
  }
}

/**
 * DELETE /api/v1/customers/:id
 * Delete customer
 */
export async function deleteCustomerController(req: Request, res: Response): Promise<void> {
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
    await deleteCustomer(id);
    res.status(200).json(createSuccessResponse(null, 'Customer deleted successfully'));
  } catch (error) {
    throw error;
  }
}

