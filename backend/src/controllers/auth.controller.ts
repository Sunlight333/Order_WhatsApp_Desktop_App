import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { loginSchema, LoginInput } from '../validators/auth.validator';
import { login, getUserById, verifyAdminPassword } from '../services/auth.service';
import { updateUser, UpdateUserInput } from '../services/user.service';
import { updateProfileSchema, UpdateProfileInput } from '../validators/user.validator';
import { createSuccessResponse } from '../utils/response.util';
import { createErrorResponse } from '../utils/error.util';
import { uploadAvatar, getAvatarUrl } from '../middleware/upload.middleware';

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Validate input
    const validatedData: LoginInput = loginSchema.parse(req.body);

    // Authenticate user
    const result = await login(validatedData.username, validatedData.password);

    res.status(200).json(
      createSuccessResponse(result, 'Login successful')
    );
  } catch (error) {
    // Pass error to error middleware - server will continue running
    next(error);
  }
}

/**
 * GET /api/v1/auth/me
 * Get current authenticated user information
 */
export async function meController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required')
      );
      return;
    }

    try {
      const user = await getUserById(req.user.userId);
      res.status(200).json(
        createSuccessResponse(user, 'User retrieved successfully')
      );
    } catch (error: any) {
      // If user not found (e.g., after database restore), return 401 to force re-login
      if (error.code === 'USER_NOT_FOUND') {
        res.status(401).json(
          createErrorResponse('USER_NOT_FOUND', 'User not found. Please log in again.')
        );
        return;
      }
      throw error;
    }
  } catch (error) {
    // Pass error to error middleware - server will continue running
    next(error);
  }
}

/**
 * PATCH /api/v1/auth/profile
 * Update current user's profile (username, password, avatar, whatsappMessage)
 */
export async function updateProfileController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required')
      );
      return;
    }

    // Validate input (only allow profile fields, not role)
    const validatedData: UpdateProfileInput = updateProfileSchema.parse(req.body);

    // Update user profile (restricted to own profile)
    const updatedUser = await updateUser(req.user.userId, validatedData as UpdateUserInput, req.user.userId);

    res.status(200).json(
      createSuccessResponse(updatedUser, 'Profile updated successfully')
    );
  } catch (error) {
    // Pass error to error middleware - server will continue running
    next(error);
  }
}

/**
 * POST /api/v1/auth/profile/avatar
 * Upload current user's avatar
 */
export async function uploadProfileAvatarController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required')
      );
      return;
    }

    const file = req.file;

    if (!file) {
      res.status(400).json(
        createErrorResponse('NO_FILE', 'No file uploaded')
      );
      return;
    }

    // Get just the filename (not full path)
    const filename = path.basename(file.path);
    const avatarUrl = getAvatarUrl(filename);

    // Update user with avatar (restricted to own profile)
    const updateData: UpdateUserInput = { avatar: avatarUrl };
    const user = await updateUser(req.user.userId, updateData, req.user.userId);

    res.status(200).json(
      createSuccessResponse(user, 'Avatar uploaded successfully')
    );
  } catch (error) {
    // Pass error to error middleware - server will continue running
    next(error);
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

/**
 * POST /api/v1/auth/verify-admin-password
 * Verify admin password for accessing protected settings
 */
export async function verifyAdminPasswordController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required')
      );
      return;
    }

    const { password } = req.body;

    if (!password || typeof password !== 'string' || !password.trim()) {
      res.status(400).json(
        createErrorResponse('INVALID_INPUT', 'Password is required')
      );
      return;
    }

    await verifyAdminPassword(password.trim());

    res.status(200).json(
      createSuccessResponse({ verified: true }, 'Admin password verified successfully')
    );
  } catch (error) {
    next(error);
  }
}

