"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrdersController = listOrdersController;
exports.getOrderController = getOrderController;
exports.createOrderController = createOrderController;
exports.updateOrderStatusController = updateOrderStatusController;
exports.updateOrderController = updateOrderController;
const order_validator_1 = require("../validators/order.validator");
const order_service_1 = require("../services/order.service");
const response_util_1 = require("../utils/response.util");
const zod_1 = require("zod");
/**
 * GET /api/v1/orders
 * List orders with pagination and filters
 */
async function listOrdersController(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search;
        const status = req.query.status;
        const result = await (0, order_service_1.listOrders)({
            page,
            limit,
            search,
            status,
        });
        res.status(200).json((0, response_util_1.createSuccessResponse)(result));
    }
    catch (error) {
        throw error;
    }
}
/**
 * GET /api/v1/orders/:id
 * Get single order by ID
 */
async function getOrderController(req, res) {
    try {
        const { id } = req.params;
        const order = await (0, order_service_1.getOrderById)(id);
        res.status(200).json((0, response_util_1.createSuccessResponse)(order, 'Order retrieved successfully'));
    }
    catch (error) {
        throw error;
    }
}
/**
 * POST /api/v1/orders
 * Create a new order
 */
async function createOrderController(req, res) {
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
        const validatedData = order_validator_1.createOrderSchema.parse(req.body);
        // Create order
        const order = await (0, order_service_1.createOrder)(req.user.userId, validatedData);
        res.status(201).json((0, response_util_1.createSuccessResponse)(order, 'Order created successfully'));
    }
    catch (error) {
        throw error;
    }
}
/**
 * PATCH /api/v1/orders/:id/status
 * Update order status
 */
async function updateOrderStatusController(req, res) {
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
        const statusSchema = zod_1.z.object({
            status: zod_1.z.enum(['PENDING', 'RECEIVED', 'NOTIFIED_CALL', 'NOTIFIED_WHATSAPP']),
            notificationMethod: zod_1.z.enum(['CALL', 'WHATSAPP']).optional(),
        });
        const { status, notificationMethod } = statusSchema.parse(req.body);
        // Update status
        const order = await (0, order_service_1.updateOrderStatus)(id, req.user.userId, status, notificationMethod);
        res.status(200).json((0, response_util_1.createSuccessResponse)(order, 'Order status updated successfully'));
    }
    catch (error) {
        throw error;
    }
}
/**
 * PUT /api/v1/orders/:id
 * Update order details
 */
async function updateOrderController(req, res) {
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
        const validatedData = order_validator_1.updateOrderSchema.parse(req.body);
        // Update order
        const order = await (0, order_service_1.updateOrder)(id, req.user.userId, validatedData);
        res.status(200).json((0, response_util_1.createSuccessResponse)(order, 'Order updated successfully'));
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=order.controller.js.map