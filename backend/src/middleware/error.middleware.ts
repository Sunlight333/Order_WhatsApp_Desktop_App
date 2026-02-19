import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/error.util';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Handle known ApiError
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const firstMessage = error.errors?.[0]?.message;
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstMessage || 'Validation failed',
        details: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(error, res);
    return;
  }

  // Handle Prisma connection errors - try to reconnect
  if (error.message?.includes('connection') || error.message?.includes('database') || error.message?.includes('ECONNREFUSED')) {
    console.warn('⚠️  Database connection error detected, attempting recovery...');
    // Don't block the response - return error but log for recovery
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'Database connection issue. Please try again.',
      },
    });
    return;
  }

  // Generic error - never crash, always return response
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError, res: Response): void {
  switch (error.code) {
    case 'P2002':
      res.status(409).json({
        success: false,
        error: {
          code: 'UNIQUE_CONSTRAINT',
          message: 'A record with this value already exists',
        },
      });
      break;
    case 'P2022':
      // Column does not exist - database schema needs to be upgraded
      const columnName = error.meta?.column as string || 'unknown';
      const modelName = error.meta?.modelName as string || 'unknown';
      res.status(500).json({
        success: false,
        error: {
          code: 'SCHEMA_OUTDATED',
          message: `Database schema is outdated. Column '${columnName}' is missing from table '${modelName}'. Please go to Settings and click 'Upgrade Database Schema' to update the database.`,
          details: {
            column: columnName,
            model: modelName,
            action: 'upgrade_schema',
          },
        },
      });
      break;
    case 'P2025':
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      });
      break;
    default:
      res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'A database error occurred',
        },
      });
  }
}

