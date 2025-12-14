import { Request, Response } from 'express';
import { testDatabaseConnection, initializeDatabase, DatabaseTestConfig } from '../services/database.service';
import { createSuccessResponse } from '../utils/response.util';
import { createErrorResponse } from '../utils/error.util';
import { PrismaClient } from '@prisma/client';
import { upgradeDatabaseSchema } from '../config/database';

/**
 * Test database connection
 * POST /api/v1/database/test
 * Body: { type: 'sqlite' | 'mysql' | 'postgresql', url?: string, path?: string }
 */
export async function testDatabaseController(req: Request, res: Response) {
  try {
    const { type, url, path } = req.body;

    if (!type) {
      res.status(400).json(
        createErrorResponse('BAD_REQUEST', 'Database type is required')
      );
      return;
    }

    if (type !== 'sqlite' && type !== 'mysql' && type !== 'postgresql') {
      res.status(400).json(
        createErrorResponse('BAD_REQUEST', 'Invalid database type. Must be sqlite, mysql, or postgresql')
      );
      return;
    }

    const config: DatabaseTestConfig = {
      type,
      url,
      path,
    };

    const result = await testDatabaseConnection(config);

    if (result.success) {
      res.status(200).json(
        createSuccessResponse(
          { 
            message: result.message,
            initialized: result.initialized || false
          }, 
          result.message
        )
      );
    } else {
      res.status(400).json(
        createErrorResponse(result.error || 'DATABASE_CONNECTION_FAILED', result.message)
      );
    }
  } catch (error: any) {
    res.status(500).json(
      createErrorResponse('INTERNAL_ERROR', error.message || 'Failed to test database connection')
    );
  }
}

/**
 * Initialize database (create schema and seed data)
 * POST /api/v1/database/initialize
 * Body: { type: 'sqlite' | 'mysql' | 'postgresql', url?: string, path?: string, force?: boolean }
 */
export async function initializeDatabaseController(req: Request, res: Response) {
  try {
    const { type, url, path, force = false } = req.body;

    if (!type) {
      res.status(400).json(
        createErrorResponse('BAD_REQUEST', 'Database type is required')
      );
      return;
    }

    if (type !== 'sqlite' && type !== 'mysql' && type !== 'postgresql') {
      res.status(400).json(
        createErrorResponse('BAD_REQUEST', 'Invalid database type. Must be sqlite, mysql, or postgresql')
      );
      return;
    }

    // Determine connection URL
    let connectionUrl: string = '';
    if (type === 'sqlite') {
      if (!path && !url) {
        res.status(400).json(
          createErrorResponse('BAD_REQUEST', 'SQLite database path is required')
        );
        return;
      }
      const dbPath = path || url?.replace(/^file:/, '') || '';
      connectionUrl = dbPath.startsWith('file:') ? dbPath : `file:${dbPath}`;
    } else {
      if (!url) {
        res.status(400).json(
          createErrorResponse('BAD_REQUEST', 'Database connection URL is required')
        );
        return;
      }
      connectionUrl = url;
    }

    // Create a temporary Prisma client with the configuration
    const testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
      log: [],
    });

    try {
      // Connect to database
      await testPrisma.$connect();

      // Initialize database
      const result = await initializeDatabase(testPrisma, type, connectionUrl, force === true);

      res.status(200).json(
        createSuccessResponse(
          { message: result.message },
          result.message
        )
      );
    } catch (error: any) {
      res.status(500).json(
        createErrorResponse('INITIALIZATION_FAILED', error.message || 'Failed to initialize database')
      );
    } finally {
      // Clean up the connection
      try {
        await testPrisma.$disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
    }
  } catch (error: any) {
    res.status(500).json(
      createErrorResponse('INTERNAL_ERROR', error.message || 'Failed to initialize database')
    );
  }
}

/**
 * Upgrade database schema (add missing columns and tables)
 * POST /api/v1/database/upgrade
 */
export async function upgradeDatabaseController(req: Request, res: Response) {
  try {
    const result = await upgradeDatabaseSchema();

    if (result.success) {
      res.status(200).json(
        createSuccessResponse(
          {
            message: result.message,
            changes: result.changes,
          },
          result.message
        )
      );
    } else {
      res.status(400).json(
        createErrorResponse('UPGRADE_FAILED', result.message)
      );
    }
  } catch (error: any) {
    res.status(500).json(
      createErrorResponse('INTERNAL_ERROR', error.message || 'Failed to upgrade database schema')
    );
  }
}

