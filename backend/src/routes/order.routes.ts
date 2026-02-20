import { Router } from 'express';
import {
  listOrdersController,
  getOrderController,
  createOrderController,
  updateOrderStatusController,
  updateOrderController,
  deleteOrderController,
} from '../controllers/order.controller';
import { updateProductReceivedController, deleteOrderProductController } from '../controllers/order-product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/orders
 * @desc    List orders with pagination and filters
 * @access  Private
 */
router.get('/', authenticate, listOrdersController);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get single order by ID
 * @access  Private
 */
router.get('/:id', authenticate, getOrderController);

/**
 * @route   POST /api/v1/orders
 * @desc    Create a new order
 * @access  Private
 */
router.post('/', authenticate, createOrderController);

/**
 * @route   PUT /api/v1/orders/:id
 * @desc    Update order details
 * @access  Private
 */
router.put('/:id', authenticate, updateOrderController);

/**
 * @route   PATCH /api/v1/orders/:id/status
 * @desc    Update order status
 * @access  Private
 */
router.patch('/:id/status', authenticate, updateOrderStatusController);

/**
 * @route   PATCH /api/v1/orders/:orderId/products/:productId/received
 * @desc    Update received quantity for an order product
 * @access  Private
 */
router.patch('/:orderId/products/:productId/received', authenticate, updateProductReceivedController);

/**
 * @route   DELETE /api/v1/orders/:orderId/products/:productId
 * @desc    Delete an order product from an order
 * @access  Private
 */
router.delete('/:orderId/products/:productId', authenticate, deleteOrderProductController);

/**
 * @route   DELETE /api/v1/orders/:id
 * @desc    Delete order
 * @access  Private (SUPER_ADMIN only)
 */
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deleteOrderController);

export default router;

