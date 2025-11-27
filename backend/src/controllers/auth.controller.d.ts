import { Request, Response } from 'express';
/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
export declare function loginController(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/auth/me
 * Get current authenticated user information
 */
export declare function meController(req: Request, res: Response): Promise<void>;
/**
 * PATCH /api/v1/auth/profile
 * Update current user's profile (password, avatar, whatsappMessage)
 */
export declare function updateProfileController(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/auth/logout
 * Logout user (client-side token removal)
 */
export declare function logoutController(req: Request, res: Response): Promise<void>;
