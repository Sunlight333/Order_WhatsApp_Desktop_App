import { Router } from 'express';
import { listSuppliersController } from '../controllers/supplier.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.get('/', authenticate, listSuppliersController);

export default router;

