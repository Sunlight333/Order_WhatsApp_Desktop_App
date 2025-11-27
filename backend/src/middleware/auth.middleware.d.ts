import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '../utils/jwt.util';
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
export declare function authenticate(req: Request, res: Response, next: NextFunction): void;
/**
 * Authorization middleware - checks if user has required role
 */
export declare function authorize(...roles: Array<'SUPER_ADMIN' | 'USER'>): (req: Request, res: Response, next: NextFunction) => void;
