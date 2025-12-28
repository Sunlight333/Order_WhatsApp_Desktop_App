import { Request, Response } from 'express';
import {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  CreateSupplierInput,
  UpdateSupplierInput,
} from '../services/supplier.service';
import { createSupplierSchema, updateSupplierSchema } from '../validators/supplier.validator';
import { createSuccessResponse } from '../utils/response.util';

/**
 * GET /api/v1/suppliers
 * List all suppliers
 */
export async function listSuppliersController(req: Request, res: Response): Promise<void> {
  try {
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
    const suppliers = await listSuppliers(sortBy, sortOrder);
    res.status(200).json(createSuccessResponse(suppliers));
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/v1/suppliers/:id
 * Get supplier by ID
 */
export async function getSupplierController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const supplier = await getSupplierById(id);
    res.status(200).json(createSuccessResponse(supplier));
  } catch (error) {
    throw error;
  }
}

/**
 * POST /api/v1/suppliers
 * Create a new supplier
 */
export async function createSupplierController(req: Request, res: Response): Promise<void> {
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

    const validatedData: CreateSupplierInput = createSupplierSchema.parse(req.body);
    const supplier = await createSupplier(validatedData);

    res.status(201).json(createSuccessResponse(supplier, 'Supplier created successfully'));
  } catch (error) {
    throw error;
  }
}

/**
 * PUT /api/v1/suppliers/:id
 * Update supplier
 */
export async function updateSupplierController(req: Request, res: Response): Promise<void> {
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
    const parsed = updateSupplierSchema.parse(req.body);
    // Filter out null values to match UpdateSupplierInput type
    const validatedData: UpdateSupplierInput = {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.description !== null && parsed.description !== undefined && { description: parsed.description }),
    };
    const supplier = await updateSupplier(id, validatedData);

    res.status(200).json(createSuccessResponse(supplier, 'Supplier updated successfully'));
  } catch (error) {
    throw error;
  }
}

/**
 * DELETE /api/v1/suppliers/:id
 * Delete supplier
 */
export async function deleteSupplierController(req: Request, res: Response): Promise<void> {
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
    const userRole = req.user?.role;
    await deleteSupplier(id, userRole);

    res.status(200).json(createSuccessResponse(null, 'Supplier deleted successfully'));
  } catch (error) {
    throw error;
  }
}

