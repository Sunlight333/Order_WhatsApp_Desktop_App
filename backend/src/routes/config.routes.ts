import { Router } from 'express';
import { getConfigController, updateConfigController, getOrderStatusConfigController, updateOrderStatusConfigController, getOrderCounterConfigController, resetOrderCounterController, setOrderPrefixController } from '../controllers/config.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Order status configuration routes (must be before /:key route)
router.get('/order-statuses', authenticate, getOrderStatusConfigController);
router.put('/order-statuses', authenticate, authorize('SUPER_ADMIN'), updateOrderStatusConfigController);

// Order counter configuration routes (must be before /:key route)
router.get('/order-counter', authenticate, authorize('SUPER_ADMIN'), getOrderCounterConfigController);
router.post('/order-counter/reset', authenticate, authorize('SUPER_ADMIN'), resetOrderCounterController);
router.put('/order-counter/prefix', authenticate, authorize('SUPER_ADMIN'), setOrderPrefixController);

// All routes require authentication
router.get('/:key', authenticate, getConfigController);
router.put('/:key', authenticate, authorize('SUPER_ADMIN'), updateConfigController);

export default router;
