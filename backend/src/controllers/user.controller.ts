import { Request, Response, NextFunction } from 'express';
import { createUserSchema, updateUserSchema, CreateUserInput, UpdateUserInput } from '../validators/user.validator';
import { listUsers, getUserById, createUser, updateUser, deleteUser } from '../services/user.service';
import { createSuccessResponse } from '../utils/response.util';
import { getAvatarUrl } from '../middleware/upload.middleware';
import path from 'path';

/**
 * GET /api/v1/users
 * List all users
 */
export async function listUsersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
    const users = await listUsers(sortBy, sortOrder);
    res.status(200).json(createSuccessResponse(users));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/users/:id
 * Get user by ID
 */
export async function getUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    res.status(200).json(createSuccessResponse(user));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/users
 * Create a new user
 */
export async function createUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const validatedData: CreateUserInput = createUserSchema.parse(req.body);
    const user = await createUser(validatedData);

    res.status(201).json(createSuccessResponse(user, 'User created successfully'));
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/users/:id
 * Update user
 */
export async function updateUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { id } = req.params;
    const validatedData: UpdateUserInput = updateUserSchema.parse(req.body);
    const user = await updateUser(id, validatedData, req.user.userId);

    res.status(200).json(createSuccessResponse(user, 'User updated successfully'));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/users/:id
 * Delete user
 */
export async function deleteUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { id } = req.params;
    await deleteUser(id, req.user.userId);

    res.status(200).json(createSuccessResponse(null, 'User deleted successfully'));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/users/:id/avatar
 * Upload user avatar
 */
export async function uploadAvatarController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
      });
      return;
    }

    // Get just the filename (not full path)
    const filename = path.basename(file.path);
    const avatarUrl = getAvatarUrl(filename);

    // Update user with avatar
    const updateData: UpdateUserInput = { avatar: avatarUrl };
    const user = await updateUser(id, updateData, req.user.userId);

    res.status(200).json(createSuccessResponse(user, 'Avatar uploaded successfully'));
  } catch (error) {
    next(error);
  }
}
