import { Request, Response } from 'express';
/**
 * POST /api/v1/backup/create
 * Create a database backup
 */
export declare function createBackupController(req: Request, res: Response): Promise<Response | void>;
/**
 * POST /api/v1/backup/restore
 * Restore database from backup file
 */
export declare function restoreBackupController(req: Request, res: Response): Promise<Response | void>;
/**
 * GET /api/v1/backup/list
 * List all available backups
 */
export declare function listBackupsController(req: Request, res: Response): Promise<Response | void>;
/**
 * POST /api/v1/backup/check-encryption
 * Check if a backup file is encrypted
 */
export declare function checkEncryptionController(req: Request, res: Response): Promise<Response | void>;
