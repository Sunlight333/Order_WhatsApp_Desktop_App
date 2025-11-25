import { Router } from 'express';
import {
  listSuppliersController,
  getSupplierController,
  createSupplierController,
  updateSupplierController,
  deleteSupplierController,
} from '../controllers/supplier.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// List is available to all authenticated users (for autocomplete)
router.get('/', authenticate, listSuppliersController);
router.get('/:id', authenticate, getSupplierController);

// CRUD operations require SUPER_ADMIN
router.post('/', authenticate, authorize('SUPER_ADMIN'), createSupplierController);
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), updateSupplierController);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deleteSupplierController);

export default router;

