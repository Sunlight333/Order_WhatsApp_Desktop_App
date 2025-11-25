import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JWTPayload } from '../utils/jwt.util';
import { createErrorResponse } from '../utils/error.util';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    res.status(401).json(createErrorResponse('UNAUTHORIZED', message));
  }
}

/**
 * Authorization middleware - checks if user has required role
 */
export function authorize(...roles: Array<'SUPER_ADMIN' | 'USER'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json(createErrorResponse('FORBIDDEN', 'Insufficient permissions'));
      return;
    }

    next();
  };
}

