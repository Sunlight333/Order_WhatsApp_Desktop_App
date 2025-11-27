"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = require("../controllers/order.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/orders
 * @desc    List orders with pagination and filters
 * @access  Private
 */
router.get('/', auth_middleware_1.authenticate, order_controller_1.listOrdersController);
/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get single order by ID
 * @access  Private
 */
router.get('/:id', auth_middleware_1.authenticate, order_controller_1.getOrderController);
/**
 * @route   POST /api/v1/orders
 * @desc    Create a new order
 * @access  Private
 */
router.post('/', auth_middleware_1.authenticate, order_controller_1.createOrderController);
/**
 * @route   PUT /api/v1/orders/:id
 * @desc    Update order details
 * @access  Private
 */
router.put('/:id', auth_middleware_1.authenticate, order_controller_1.updateOrderController);
/**
 * @route   PATCH /api/v1/orders/:id/status
 * @desc    Update order status
 * @access  Private
 */
router.patch('/:id/status', auth_middleware_1.authenticate, order_controller_1.updateOrderStatusController);
exports.default = router;
//# sourceMappingURL=order.routes.js.map