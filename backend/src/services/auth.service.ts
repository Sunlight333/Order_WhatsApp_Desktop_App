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
    avatar?: string | null;
    whatsappMessage?: string | null;
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
    role: user.role as 'SUPER_ADMIN' | 'USER',
  };

  const token = generateToken(payload);

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role as 'SUPER_ADMIN' | 'USER',
      avatar: (user as any).avatar || null,
      whatsappMessage: (user as any).whatsappMessage || null,
    },
    token,
  };
}

/**
 * Get user by ID (for token verification)
 */
export async function getUserById(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        avatar: true,
        whatsappMessage: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw createError('USER_NOT_FOUND', 'User not found', 404);
    }

    return user;
  } catch (error: any) {
    // If avatar or whatsappMessage column doesn't exist yet, query without them
    if (error.code === 'P2022' && (error.meta?.column?.includes('avatar') || error.meta?.column?.includes('whatsappMessage'))) {
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

      return { ...user, avatar: null, whatsappMessage: null };
    }
    throw createError('USER_FETCH_ERROR', `Failed to fetch user: ${error.message}`, 500);
  }
}

/**
 * Verify admin password (for accessing protected settings)
 * This allows non-admin users to access settings by providing admin password
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    // Find admin user (SUPER_ADMIN role)
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN',
      },
    });

    if (!adminUser) {
      throw createError('ADMIN_NOT_FOUND', 'Admin user not found in the system', 404);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, adminUser.password);

    if (!isPasswordValid) {
      throw createError('INVALID_ADMIN_PASSWORD', 'Invalid admin password', 401);
    }

    return true;
  } catch (error: any) {
    if (error.code === 'ADMIN_NOT_FOUND' || error.code === 'INVALID_ADMIN_PASSWORD') {
      throw error;
    }
    throw createError('VERIFICATION_FAILED', `Failed to verify admin password: ${error.message}`, 500);
  }
}

