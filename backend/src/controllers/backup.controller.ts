import { Request, Response } from 'express';
import path from 'path';
import { backupDatabase, restoreDatabase, listBackups, checkBackupEncryption } from '../services/backup.service';
import { createSuccessResponse } from '../utils/response.util';
import { createErrorResponse } from '../utils/error.util';
import { getPrismaClient } from '../config/database';

/**
 * POST /api/v1/backup/create
 * Create a database backup
 */
export async function createBackupController(req: Request, res: Response): Promise<Response | void> {
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
    
    const result = await backupDatabase(backupPassword, customPath);
    
    res.status(200).json(
      createSuccessResponse(
        {
          path: result.path,
          size: result.size,
          encrypted: result.encrypted,
          message: `Backup created successfully: ${path.basename(result.path)}${result.encrypted ? ' (encrypted)' : ''}`,
        },
        result.encrypted 
          ? 'Encrypted database backup created successfully'
          : 'Database backup created successfully'
      )
    );
  } catch (error: any) {
    return res.status(error.statusCode || 500).json(
      createErrorResponse(
        error.code || 'BACKUP_FAILED',
        error.message || 'Failed to create database backup'
      )
    );
  }
}

/**
 * POST /api/v1/backup/restore
 * Restore database from backup file
 */
export async function restoreBackupController(req: Request, res: Response): Promise<Response | void> {
  try {
    const { filePath, password } = req.body;

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json(
        createErrorResponse('INVALID_INPUT', 'Backup file path is required')
      );
    }

    // Password handling: accept empty string as "no password", but preserve actual password strings
    // Check if password field exists and is a non-empty string
    let restorePassword: string | undefined = undefined;
    if (password !== undefined && password !== null) {
      if (typeof password === 'string') {
        const trimmedPassword = password.trim();
        // Only set password if it's not empty
        if (trimmedPassword.length > 0) {
          restorePassword = trimmedPassword;
        }
      }
    }

    await restoreDatabase(filePath, restorePassword);

    // Reconnect Prisma after restore
    // Note: The Prisma client will automatically reconnect on next query
    // But we can force reconnection by disconnecting and reconnecting
    const prisma = getPrismaClient();
    await prisma.$connect();

    res.status(200).json(
      createSuccessResponse(
        null,
        'Database restored successfully. Please restart the application.'
      )
    );
  } catch (error: any) {
    return res.status(error.statusCode || 500).json(
      createErrorResponse(
        error.code || 'RESTORE_FAILED',
        error.message || 'Failed to restore database'
      )
    );
  }
}

/**
 * GET /api/v1/backup/list
 * List all available backups
 */
export async function listBackupsController(req: Request, res: Response): Promise<Response | void> {
  try {
    const backups = await listBackups();
    
    res.status(200).json(
      createSuccessResponse(backups, 'Backups retrieved successfully')
    );
  } catch (error: any) {
    return res.status(error.statusCode || 500).json(
      createErrorResponse(
        error.code || 'LIST_BACKUPS_FAILED',
        error.message || 'Failed to list backups'
      )
    );
  }
}

/**
 * POST /api/v1/backup/check-encryption
 * Check if a backup file is encrypted
 */
export async function checkEncryptionController(req: Request, res: Response): Promise<Response | void> {
  try {
    const { filePath } = req.body;

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json(
        createErrorResponse('INVALID_INPUT', 'Backup file path is required')
      );
    }

    const result = await checkBackupEncryption(filePath);
    
    res.status(200).json(
      createSuccessResponse(result, 'Encryption status retrieved successfully')
    );
  } catch (error: any) {
    return res.status(error.statusCode || 500).json(
      createErrorResponse(
        error.code || 'CHECK_ENCRYPTION_FAILED',
        error.message || 'Failed to check backup encryption'
      )
    );
  }
}

