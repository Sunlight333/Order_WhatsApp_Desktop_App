import { Request, Response } from 'express';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getPendingProducts,
  CreateProductInput,
  UpdateProductInput,
} from '../services/product.service';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { createSuccessResponse } from '../utils/response.util';

/**
 * GET /api/v1/products
 * List products (optionally filtered by supplier)
 */
export async function listProductsController(req: Request, res: Response): Promise<void> {
  try {
    const supplierId = req.query.supplierId as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
    const products = await listProducts(supplierId, sortBy, sortOrder);
    res.status(200).json(createSuccessResponse(products));
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/v1/products/:id
 * Get product by ID
 */
export async function getProductController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const product = await getProductById(id);
    res.status(200).json(createSuccessResponse(product));
  } catch (error) {
    throw error;
  }
}

/**
 * POST /api/v1/products
 * Create a new product
 */
export async function createProductController(req: Request, res: Response): Promise<void> {
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

    const validatedData: CreateProductInput = createProductSchema.parse(req.body);
    const product = await createProduct(validatedData);

    res.status(201).json(createSuccessResponse(product, 'Product created successfully'));
  } catch (error) {
    throw error;
  }
}

/**
 * PUT /api/v1/products/:id
 * Update product
 */
export async function updateProductController(req: Request, res: Response): Promise<void> {
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
    const parsed = updateProductSchema.parse(req.body);
    // Filter out null values to match UpdateProductInput type
    const validatedData: UpdateProductInput = {
      ...(parsed.reference !== undefined && { reference: parsed.reference }),
      ...(parsed.description !== null && parsed.description !== undefined && { description: parsed.description }),
      ...(parsed.defaultPrice !== null && parsed.defaultPrice !== undefined && { defaultPrice: parsed.defaultPrice }),
    };
    const product = await updateProduct(id, validatedData);

    res.status(200).json(createSuccessResponse(product, 'Product updated successfully'));
  } catch (error) {
    throw error;
  }
}

/**
 * DELETE /api/v1/products/:id
 * Delete product
 */
export async function deleteProductController(req: Request, res: Response): Promise<void> {
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
    await deleteProduct(id);

    res.status(200).json(createSuccessResponse(null, 'Product deleted successfully'));
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/v1/products/pending
 * Get pending products (products that haven't been fully received)
 */
export async function getPendingProductsController(req: Request, res: Response): Promise<void> {
  try {
    const pendingProducts = await getPendingProducts();
    res.status(200).json(createSuccessResponse(pendingProducts));
  } catch (error) {
    throw error;
  }
}

