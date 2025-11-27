import { Router } from 'express';
import { createBackupController, restoreBackupController, listBackupsController, checkEncryptionController } from '../controllers/backup.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/backup/create
 * @desc    Create a database backup
 * @access  Private (Super Admin only)
 */
router.post('/create', authenticate, authorize('SUPER_ADMIN'), createBackupController);

/**
 * @route   POST /api/v1/backup/restore
 * @desc    Restore database from backup file
 * @access  Private (Super Admin only)
 */
router.post('/restore', authenticate, authorize('SUPER_ADMIN'), restoreBackupController);

/**
 * @route   POST /api/v1/backup/check-encryption
 * @desc    Check if a backup file is encrypted
 * @access  Private (Super Admin only)
 */
router.post('/check-encryption', authenticate, authorize('SUPER_ADMIN'), checkEncryptionController);

/**
 * @route   GET /api/v1/backup/list
 * @desc    List all available backups
 * @access  Private (Super Admin only)
 */
router.get('/list', authenticate, authorize('SUPER_ADMIN'), listBackupsController);

export default router;

