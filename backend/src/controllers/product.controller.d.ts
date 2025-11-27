import { Request, Response } from 'express';
/**
 * GET /api/v1/products
 * List products (optionally filtered by supplier)
 */
export declare function listProductsController(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/products/:id
 * Get product by ID
 */
export declare function getProductController(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/products
 * Create a new product
 */
export declare function createProductController(req: Request, res: Response): Promise<void>;
/**
 * PUT /api/v1/products/:id
 * Update product
 */
export declare function updateProductController(req: Request, res: Response): Promise<void>;
/**
 * DELETE /api/v1/products/:id
 * Delete product
 */
export declare function deleteProductController(req: Request, res: Response): Promise<void>;
