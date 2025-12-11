import { Router } from 'express';
import {
  listCustomersController,
  getCustomerController,
  searchCustomersController,
  createCustomerController,
  updateCustomerController,
  deleteCustomerController,
} from '../controllers/customer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Search and list are available to all authenticated users (for autocomplete/hint text)
router.get('/search', authenticate, searchCustomersController);
router.get('/', authenticate, listCustomersController);
router.get('/:id', authenticate, getCustomerController);

// Create is available to all authenticated users (auto-register on order creation)
router.post('/', authenticate, createCustomerController);

// Update and delete require SUPER_ADMIN
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), updateCustomerController);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deleteCustomerController);

export default router;

