import { Request, Response } from 'express';
import { createOrderSchema, updateOrderSchema, CreateOrderInput, UpdateOrderInput } from '../validators/order.validator';
import { createOrder, getOrderById, listOrders, updateOrderStatus, updateOrder } from '../services/order.service';
import { createSuccessResponse } from '../utils/response.util';
import { z } from 'zod';

/**
 * GET /api/v1/orders
 * List orders with pagination and filters
 */
export async function listOrdersController(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const result = await listOrders({
      page,
      limit,
      search,
      status,
    });

    res.status(200).json(createSuccessResponse(result));
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/v1/orders/:id
 * Get single order by ID
 */
export async function getOrderController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const order = await getOrderById(id);

    res.status(200).json(createSuccessResponse(order, 'Order retrieved successfully'));
  } catch (error) {
    throw error;
  }
}

/**
 * POST /api/v1/orders
 * Create a new order
 */
export async function createOrderController(req: Request, res: Response): Promise<void> {
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

    // Validate input
    const validatedData: CreateOrderInput = createOrderSchema.parse(req.body);

    // Create order
    const order = await createOrder(req.user.userId, validatedData);

    res.status(201).json(createSuccessResponse(order, 'Order created successfully'));
  } catch (error) {
    throw error;
  }
}

/**
 * PATCH /api/v1/orders/:id/status
 * Update order status
 */
export async function updateOrderStatusController(req: Request, res: Response): Promise<void> {
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
    
    // Validate input
    const statusSchema = z.object({
      status: z.enum(['PENDING', 'RECEIVED', 'NOTIFIED_CALL', 'NOTIFIED_WHATSAPP']),
      notificationMethod: z.enum(['CALL', 'WHATSAPP']).optional(),
    });

    const { status, notificationMethod } = statusSchema.parse(req.body);

    // Update status
    const order = await updateOrderStatus(id, req.user.userId, status, notificationMethod);

    res.status(200).json(createSuccessResponse(order, 'Order status updated successfully'));
  } catch (error) {
    throw error;
  }
}

/**
 * PUT /api/v1/orders/:id
 * Update order details
 */
export async function updateOrderController(req: Request, res: Response): Promise<void> {
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

    // Validate input
    const validatedData: UpdateOrderInput = updateOrderSchema.parse(req.body);

    // Update order
    const order = await updateOrder(id, req.user.userId, validatedData);

    res.status(200).json(createSuccessResponse(order, 'Order updated successfully'));
  } catch (error) {
    throw error;
  }
}

