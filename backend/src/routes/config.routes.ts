import { Router } from 'express';
import { getConfigController, updateConfigController, getOrderStatusConfigController, updateOrderStatusConfigController } from '../controllers/config.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Order status configuration routes (must be before /:key route)
router.get('/order-statuses', authenticate, getOrderStatusConfigController);
router.put('/order-statuses', authenticate, authorize('SUPER_ADMIN'), updateOrderStatusConfigController);

// All routes require authentication
router.get('/:key', authenticate, getConfigController);
router.put('/:key', authenticate, authorize('SUPER_ADMIN'), updateConfigController);

export default router;
