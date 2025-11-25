import { Router } from 'express';
import {
  listProductsController,
  getProductController,
  createProductController,
  updateProductController,
  deleteProductController,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// List is available to all authenticated users (for autocomplete)
router.get('/', authenticate, listProductsController);
router.get('/:id', authenticate, getProductController);

// CRUD operations require SUPER_ADMIN
router.post('/', authenticate, authorize('SUPER_ADMIN'), createProductController);
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), updateProductController);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deleteProductController);

export default router;

