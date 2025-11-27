import { Request, Response } from 'express';
import { testDatabaseConnection, DatabaseTestConfig } from '../services/database.service';
import { createSuccessResponse } from '../utils/response.util';
import { createErrorResponse } from '../utils/error.util';

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

