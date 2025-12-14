import { Request, Response, NextFunction } from 'express';
import { createOrderSchema, updateOrderSchema, CreateOrderInput, UpdateOrderInput } from '../validators/order.validator';
import { createOrder, getOrderById, listOrders, updateOrderStatus, updateOrder } from '../services/order.service';
import { createSuccessResponse } from '../utils/response.util';
import { z } from 'zod';

/**
 * GET /api/v1/orders
 * List orders with pagination and filters
 */
export async function listOrdersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const updatedDateFrom = req.query.updatedDateFrom as string;
    const updatedDateTo = req.query.updatedDateTo as string;
    const supplierIds = req.query.supplierIds as string;
    const customerId = req.query.customerId as string;
    const createdById = req.query.createdById as string;
    const minAmount = req.query.minAmount as string;
    const maxAmount = req.query.maxAmount as string;
    const minOrderNumber = req.query.minOrderNumber as string;
    const maxOrderNumber = req.query.maxOrderNumber as string;
    const hasObservations = req.query.hasObservations as string;
    const sortBy = req.query.sortBy as string;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const result = await listOrders({
      page,
      limit,
      search,
      status,
      dateFrom,
      dateTo,
      updatedDateFrom,
      updatedDateTo,
      supplierIds,
      customerId,
      createdById,
      minAmount,
      maxAmount,
      minOrderNumber,
      maxOrderNumber,
      hasObservations,
      sortBy,
      sortOrder,
    });

    res.status(200).json(createSuccessResponse(result));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/orders/:id
 * Get single order by ID
 */
export async function getOrderController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const order = await getOrderById(id);

    res.status(200).json(createSuccessResponse(order, 'Order retrieved successfully'));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/orders
 * Create a new order
 */
export async function createOrderController(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    next(error);
  }
}

/**
 * PATCH /api/v1/orders/:id/status
 * Update order status
 */
export async function updateOrderStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      status: z.enum(['PENDING', 'RECEIVED', 'NOTIFIED_CALL', 'NOTIFIED_WHATSAPP', 'CANCELLED', 'DELIVERED_COUNTER']),
      notificationMethod: z.enum(['CALL', 'WHATSAPP']).optional(),
      cancellationReason: z.string().min(1, 'Cancellation reason is required').optional(),
    });

    const { status, notificationMethod, cancellationReason } = statusSchema.parse(req.body);

    // Update status
    const order = await updateOrderStatus(id, req.user.userId, status, notificationMethod, cancellationReason);

    res.status(200).json(createSuccessResponse(order, 'Order status updated successfully'));
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/orders/:id
 * Update order details
 */
export async function updateOrderController(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    next(error);
  }
}

