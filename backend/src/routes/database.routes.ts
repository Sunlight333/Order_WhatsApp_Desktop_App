import { Router } from 'express';
import { testDatabaseController, initializeDatabaseController } from '../controllers/database.controller';

const router = Router();

// Database test endpoint - public (needed for configuration before login)
router.post('/test', testDatabaseController);

// Database initialize endpoint - public (needed for configuration before login)
router.post('/initialize', initializeDatabaseController);

export default router;

