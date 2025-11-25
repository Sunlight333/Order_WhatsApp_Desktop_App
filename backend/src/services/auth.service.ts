import bcrypt from 'bcrypt';
import { getPrismaClient } from '../config/database';
import { generateToken, JWTPayload } from '../utils/jwt.util';
import { createError } from '../utils/error.util';

const prisma = getPrismaClient();

export interface LoginResult {
  user: {
    id: string;
    username: string;
    role: 'SUPER_ADMIN' | 'USER';
  };
  token: string;
}

/**
 * Authenticate user with username and password
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  // Find user by username
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw createError('INVALID_CREDENTIALS', 'Invalid username or password', 401);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw createError('INVALID_CREDENTIALS', 'Invalid username or password', 401);
  }

  // Generate JWT token
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const token = generateToken(payload);

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    token,
  };
}

/**
 * Get user by ID (for token verification)
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw createError('USER_NOT_FOUND', 'User not found', 404);
  }

  return user;
}

