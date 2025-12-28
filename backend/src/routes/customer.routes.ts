import { Router } from 'express';
import {
  listCustomersController,
  getCustomerController,
  searchCustomersController,
  createCustomerController,
  updateCustomerController,
  deleteCustomerController,
  getCustomerAuditLogsController,
} from '../controllers/customer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Search and list are available to all authenticated users (for autocomplete/hint text)
router.get('/search', authenticate, searchCustomersController);
router.get('/', authenticate, listCustomersController);
// Audit logs route must come before /:id to avoid route conflicts
router.get('/:id/audit-logs', authenticate, authorize('SUPER_ADMIN'), getCustomerAuditLogsController);
router.get('/:id', authenticate, getCustomerController);

// Create is available to all authenticated users (auto-register on order creation)
router.post('/', authenticate, createCustomerController);

// Update is available to all authenticated users
router.put('/:id', authenticate, updateCustomerController);

// Delete requires SUPER_ADMIN
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), deleteCustomerController);

export default router;

