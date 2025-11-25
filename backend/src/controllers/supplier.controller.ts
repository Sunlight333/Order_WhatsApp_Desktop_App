import { Request, Response } from 'express';
import { listSuppliers } from '../services/supplier.service';
import { createSuccessResponse } from '../utils/response.util';

/**
 * GET /api/v1/suppliers
 * List all suppliers (for autocomplete hints)
 */
export async function listSuppliersController(req: Request, res: Response): Promise<void> {
  try {
    const suppliers = await listSuppliers();
    res.status(200).json(createSuccessResponse(suppliers));
  } catch (error) {
    throw error;
  }
}

