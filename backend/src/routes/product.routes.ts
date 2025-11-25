import { Router } from 'express';
import { listProductsController } from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.get('/', authenticate, listProductsController);

export default router;

