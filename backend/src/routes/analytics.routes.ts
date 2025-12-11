import { Router } from 'express';
import {
  getTopProductsController,
  getTopCustomersController,
  getOrderStatisticsController,
} from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All analytics routes require SUPER_ADMIN
router.get('/top-products', authenticate, authorize('SUPER_ADMIN'), getTopProductsController);
router.get('/top-customers', authenticate, authorize('SUPER_ADMIN'), getTopCustomersController);
router.get('/order-statistics', authenticate, authorize('SUPER_ADMIN'), getOrderStatisticsController);

export default router;

