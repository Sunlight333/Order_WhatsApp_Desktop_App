"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackupController = createBackupController;
exports.restoreBackupController = restoreBackupController;
exports.listBackupsController = listBackupsController;
exports.checkEncryptionController = checkEncryptionController;
const path_1 = __importDefault(require("path"));
const backup_service_1 = require("../services/backup.service");
const response_util_1 = require("../utils/response.util");
const error_util_1 = require("../utils/error.util");
const database_1 = require("../config/database");
/**
 * POST /api/v1/backup/create
 * Create a database backup
 */
async function createBackupController(req, res) {
    try {
        const { password, filePath } = req.body;
        // Password is optional, but if provided, must be a non-empty string
        const backupPassword = password && typeof password === 'string' && password.trim()
            ? password.trim()
            : undefined;
        // File path is optional - if provided, save backup at that location
        const customPath = filePath && typeof filePath === 'string' && filePath.trim()
            ? filePath.trim()
            : undefined;
        const result = await (0, backup_service_1.backupDatabase)(backupPassword, customPath);
        res.status(200).json((0, response_util_1.createSuccessResponse)({
            path: result.path,
            size: result.size,
            encrypted: result.encrypted,
            message: `Backup created successfully: ${path_1.default.basename(result.path)}${result.encrypted ? ' (encrypted)' : ''}`,
        }, result.encrypted
            ? 'Encrypted database backup created successfully'
            : 'Database backup created successfully'));
    }
    catch (error) {
        return res.status(error.statusCode || 500).json((0, error_util_1.createErrorResponse)(error.code || 'BACKUP_FAILED', error.message || 'Failed to create database backup'));
    }
}
/**
 * POST /api/v1/backup/restore
 * Restore database from backup file
 */
async function restoreBackupController(req, res) {
    try {
        const { filePath, password } = req.body;
        if (!filePath || typeof filePath !== 'string') {
            return res.status(400).json((0, error_util_1.createErrorResponse)('INVALID_INPUT', 'Backup file path is required'));
        }
        // Password is optional, but may be required if backup is encrypted
        const restorePassword = password && typeof password === 'string' && password.trim()
            ? password.trim()
            : undefined;
        await (0, backup_service_1.restoreDatabase)(filePath, restorePassword);
        // Reconnect Prisma after restore
        // Note: The Prisma client will automatically reconnect on next query
        // But we can force reconnection by disconnecting and reconnecting
        const prisma = (0, database_1.getPrismaClient)();
        await prisma.$connect();
        res.status(200).json((0, response_util_1.createSuccessResponse)(null, 'Database restored successfully. Please restart the application.'));
    }
    catch (error) {
        return res.status(error.statusCode || 500).json((0, error_util_1.createErrorResponse)(error.code || 'RESTORE_FAILED', error.message || 'Failed to restore database'));
    }
}
/**
 * GET /api/v1/backup/list
 * List all available backups
 */
async function listBackupsController(req, res) {
    try {
        const backups = await (0, backup_service_1.listBackups)();
        res.status(200).json((0, response_util_1.createSuccessResponse)(backups, 'Backups retrieved successfully'));
    }
    catch (error) {
        return res.status(error.statusCode || 500).json((0, error_util_1.createErrorResponse)(error.code || 'LIST_BACKUPS_FAILED', error.message || 'Failed to list backups'));
    }
}
/**
 * POST /api/v1/backup/check-encryption
 * Check if a backup file is encrypted
 */
async function checkEncryptionController(req, res) {
    try {
        const { filePath } = req.body;
        if (!filePath || typeof filePath !== 'string') {
            return res.status(400).json((0, error_util_1.createErrorResponse)('INVALID_INPUT', 'Backup file path is required'));
        }
        const result = await (0, backup_service_1.checkBackupEncryption)(filePath);
        res.status(200).json((0, response_util_1.createSuccessResponse)(result, 'Encryption status retrieved successfully'));
    }
    catch (error) {
        return res.status(error.statusCode || 500).json((0, error_util_1.createErrorResponse)(error.code || 'CHECK_ENCRYPTION_FAILED', error.message || 'Failed to check backup encryption'));
    }
}
//# sourceMappingURL=backup.controller.js.map