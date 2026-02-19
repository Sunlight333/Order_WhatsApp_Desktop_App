import { Request, Response, NextFunction } from 'express';
import { createOrderSchema, updateOrderSchema, CreateOrderInput, UpdateOrderInput } from '../validators/order.validator';
import { createOrder, getOrderById, listOrders, updateOrderStatus, updateOrder, deleteOrder } from '../services/order.service';
import { createSuccessResponse } from '../utils/response.util';
import { authorize } from '../middleware/auth.middleware';
import { getConfigValue } from '../services/config.service';
import { z } from 'zod';
import { ORDER_STATUS_VALUES } from '../constants/order-status';

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
    const notifiedDateFrom = req.query.notifiedDateFrom as string;
    const notifiedDateTo = req.query.notifiedDateTo as string;
    const supplierIds = req.query.supplierIds as string;
    const customerId = req.query.customerId as string;
    let createdById = req.query.createdById as string;
    const minAmount = req.query.minAmount as string;
    const maxAmount = req.query.maxAmount as string;
    const minOrderNumber = req.query.minOrderNumber as string;
    const maxOrderNumber = req.query.maxOrderNumber as string;
    const hasObservations = req.query.hasObservations as string;
    const sortBy = req.query.sortBy as string;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    // If user is not SUPER_ADMIN, check if they should only see their own orders
    if (req.user && req.user.role !== 'SUPER_ADMIN') {
      try {
        // Global default
        const globalConfig = await getConfigValue('users_see_only_own_orders');
        const globalOwnOnly = globalConfig?.value === 'true';

        // Per-user override (JSON map: { [userId]: "OWN" | "ALL" })
        let override: 'OWN' | 'ALL' | null = null;
        try {
          const enabledConfig = await getConfigValue('users_orders_visibility_overrides_enabled');
          const overridesEnabled = enabledConfig?.value === 'true';
          if (overridesEnabled) {
            const overridesConfig = await getConfigValue('users_orders_visibility_overrides');
            if (overridesConfig?.value) {
              const parsed = JSON.parse(overridesConfig.value) as Record<string, unknown>;
              const raw = parsed?.[req.user.userId];
              if (raw === 'OWN' || raw === 'ALL') {
                override = raw;
              }
            }
          }
        } catch (e) {
          // Ignore parse errors for backward compatibility
        }

        // Apply effective policy:
        // - Override OWN => force own orders
        // - Override ALL => always allow all orders (even if global is enabled)
        // - Otherwise => use global config
        const effectiveOwnOnly = override === 'OWN' ? true : override === 'ALL' ? false : globalOwnOnly;

        if (effectiveOwnOnly) {
          createdById = req.user.userId;
        }
      } catch (error) {
        // If config doesn't exist or error, default to showing all orders (backward compatibility)
        console.warn('Failed to check users_see_only_own_orders config:', error);
      }
    }

    const result = await listOrders({
      page,
      limit,
      search,
      status,
      dateFrom,
      dateTo,
      updatedDateFrom,
      updatedDateTo,
      notifiedDateFrom,
      notifiedDateTo,
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
      status: z.enum(ORDER_STATUS_VALUES),
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

/**
 * DELETE /api/v1/orders/:id
 * Delete order - Only SUPER_ADMIN
 */
export async function deleteOrderController(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    // Only SUPER_ADMIN can delete orders
    if (req.user.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only SUPER_ADMIN can delete orders',
        },
      });
      return;
    }

    const { id } = req.params;
    const userId = req.user?.userId;
    await deleteOrder(id, userId);
    res.status(200).json(createSuccessResponse(null, 'Order deleted successfully'));
  } catch (error) {
    next(error);
  }
}

