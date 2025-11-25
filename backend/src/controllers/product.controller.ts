import { Request, Response } from 'express';
import { listProductsBySupplier } from '../services/product.service';
import { createSuccessResponse } from '../utils/response.util';

/**
 * GET /api/v1/products
 * List products, optionally filtered by supplier (for autocomplete hints)
 */
export async function listProductsController(req: Request, res: Response): Promise<void> {
  try {
    const supplierId = req.query.supplierId as string | undefined;
    const products = await listProductsBySupplier(supplierId);
    res.status(200).json(createSuccessResponse(products));
  } catch (error) {
    throw error;
  }
}

