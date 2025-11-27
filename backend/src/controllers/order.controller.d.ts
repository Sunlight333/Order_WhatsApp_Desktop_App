import { Request, Response } from 'express';
/**
 * GET /api/v1/orders
 * List orders with pagination and filters
 */
export declare function listOrdersController(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/orders/:id
 * Get single order by ID
 */
export declare function getOrderController(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/orders
 * Create a new order
 */
export declare function createOrderController(req: Request, res: Response): Promise<void>;
/**
 * PATCH /api/v1/orders/:id/status
 * Update order status
 */
export declare function updateOrderStatusController(req: Request, res: Response): Promise<void>;
/**
 * PUT /api/v1/orders/:id
 * Update order details
 */
export declare function updateOrderController(req: Request, res: Response): Promise<void>;
