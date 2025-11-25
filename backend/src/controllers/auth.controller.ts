import { Request, Response } from 'express';
import { loginSchema, LoginInput } from '../validators/auth.validator';
import { login, getUserById } from '../services/auth.service';
import { createSuccessResponse } from '../utils/response.util';
import { createErrorResponse } from '../utils/error.util';

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
export async function loginController(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validatedData: LoginInput = loginSchema.parse(req.body);

    // Authenticate user
    const result = await login(validatedData.username, validatedData.password);

    res.status(200).json(
      createSuccessResponse(result, 'Login successful')
    );
  } catch (error) {
    // Re-throw to be handled by error middleware
    throw error;
  }
}

/**
 * GET /api/v1/auth/me
 * Get current authenticated user information
 */
export async function meController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required')
      );
      return;
    }

    const user = await getUserById(req.user.userId);

    res.status(200).json(
      createSuccessResponse(user, 'User retrieved successfully')
    );
  } catch (error) {
    // Re-throw to be handled by error middleware
    throw error;
  }
}

/**
 * POST /api/v1/auth/logout
 * Logout user (client-side token removal)
 */
export async function logoutController(req: Request, res: Response): Promise<void> {
  // Since we're using JWT, logout is handled client-side by removing the token
  // This endpoint is just for consistency
  res.status(200).json(
    createSuccessResponse(null, 'Logout successful')
  );
}

