import { Router } from 'express';
import { testDatabaseController, initializeDatabaseController, upgradeDatabaseController } from '../controllers/database.controller';

const router = Router();

// Database test endpoint - public (needed for configuration before login)
router.post('/test', testDatabaseController);

// Database initialize endpoint - public (needed for configuration before login)
router.post('/initialize', initializeDatabaseController);

// Database upgrade endpoint - public (needed for schema updates)
router.post('/upgrade', upgradeDatabaseController);

export default router;

