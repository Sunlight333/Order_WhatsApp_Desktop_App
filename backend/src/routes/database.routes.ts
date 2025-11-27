import { Router } from 'express';
import { testDatabaseController } from '../controllers/database.controller';

const router = Router();

// Database test endpoint - public (needed for configuration before login)
router.post('/test', testDatabaseController);

export default router;

