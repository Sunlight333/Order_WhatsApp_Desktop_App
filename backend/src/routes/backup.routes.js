"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const backup_controller_1 = require("../controllers/backup.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/backup/create
 * @desc    Create a database backup
 * @access  Private (Super Admin only)
 */
router.post('/create', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('SUPER_ADMIN'), backup_controller_1.createBackupController);
/**
 * @route   POST /api/v1/backup/restore
 * @desc    Restore database from backup file
 * @access  Private (Super Admin only)
 */
router.post('/restore', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('SUPER_ADMIN'), backup_controller_1.restoreBackupController);
/**
 * @route   POST /api/v1/backup/check-encryption
 * @desc    Check if a backup file is encrypted
 * @access  Private (Super Admin only)
 */
router.post('/check-encryption', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('SUPER_ADMIN'), backup_controller_1.checkEncryptionController);
/**
 * @route   GET /api/v1/backup/list
 * @desc    List all available backups
 * @access  Private (Super Admin only)
 */
router.get('/list', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('SUPER_ADMIN'), backup_controller_1.listBackupsController);
exports.default = router;
//# sourceMappingURL=backup.routes.js.map