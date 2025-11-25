import { Router } from 'express';
import { getConfigController, updateConfigController } from '../controllers/config.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.get('/:key', authenticate, getConfigController);
router.put('/:key', authenticate, authorize('SUPER_ADMIN'), updateConfigController);

export default router;
