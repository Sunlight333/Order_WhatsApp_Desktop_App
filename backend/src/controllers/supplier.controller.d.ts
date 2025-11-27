import { Request, Response } from 'express';
/**
 * GET /api/v1/suppliers
 * List all suppliers
 */
export declare function listSuppliersController(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/suppliers/:id
 * Get supplier by ID
 */
export declare function getSupplierController(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/suppliers
 * Create a new supplier
 */
export declare function createSupplierController(req: Request, res: Response): Promise<void>;
/**
 * PUT /api/v1/suppliers/:id
 * Update supplier
 */
export declare function updateSupplierController(req: Request, res: Response): Promise<void>;
/**
 * DELETE /api/v1/suppliers/:id
 * Delete supplier
 */
export declare function deleteSupplierController(req: Request, res: Response): Promise<void>;
