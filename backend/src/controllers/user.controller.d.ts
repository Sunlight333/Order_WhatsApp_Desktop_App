import { Request, Response } from 'express';
/**
 * GET /api/v1/users
 * List all users
 */
export declare function listUsersController(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/users/:id
 * Get user by ID
 */
export declare function getUserController(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/users
 * Create a new user
 */
export declare function createUserController(req: Request, res: Response): Promise<void>;
/**
 * PUT /api/v1/users/:id
 * Update user
 */
export declare function updateUserController(req: Request, res: Response): Promise<void>;
/**
 * DELETE /api/v1/users/:id
 * Delete user
 */
export declare function deleteUserController(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/users/:id/avatar
 * Upload user avatar
 */
export declare function uploadAvatarController(req: Request, res: Response): Promise<void>;
