import { Router } from 'express';
import {
  getTopProductsController,
  getTopCustomersController,
  getOrderStatisticsController,
  getSupplierMonthlyController,
  getOrdersByMonthController,
  getQuantityByReferenceController,
} from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All analytics routes require SUPER_ADMIN
router.get('/top-products', authenticate, authorize('SUPER_ADMIN'), getTopProductsController);
router.get('/top-customers', authenticate, authorize('SUPER_ADMIN'), getTopCustomersController);
router.get('/order-statistics', authenticate, authorize('SUPER_ADMIN'), getOrderStatisticsController);
router.get('/supplier-monthly', authenticate, authorize('SUPER_ADMIN'), getSupplierMonthlyController);
router.get('/orders-by-month', authenticate, authorize('SUPER_ADMIN'), getOrdersByMonthController);
router.get('/quantity-by-reference', authenticate, authorize('SUPER_ADMIN'), getQuantityByReferenceController);

export default router;

