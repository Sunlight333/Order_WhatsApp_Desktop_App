import { getPrismaClient } from '../config/database';
import { createError } from '../utils/error.util';
import bcrypt from 'bcrypt';

const prisma = getPrismaClient();

export interface CreateUserInput {
  username: string;
  password: string;
  role: 'SUPER_ADMIN' | 'USER';
  avatar?: string | null;
}

export interface UpdateUserInput {
  username?: string;
  password?: string;
  role?: 'SUPER_ADMIN' | 'USER';
  avatar?: string | null;
  whatsappMessage?: string | null;
}

/**
 * List all users
 */
export async function listUsers(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
  // Map frontend sort keys to database fields
  const sortFieldMap: Record<string, string> = {
    username: 'username',
    role: 'role',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  };

  const sortField = sortBy && sortFieldMap[sortBy] ? sortFieldMap[sortBy] : 'createdAt';
  const orderBy: any = { [sortField]: sortOrder };

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        avatar: true,
        whatsappMessage: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
    });

    return users;
  } catch (error: any) {
    // If avatar or whatsappMessage column doesn't exist yet, query without them
    if (error.code === 'P2022' && (error.meta?.column?.includes('avatar') || error.meta?.column?.includes('whatsappMessage'))) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy,
      });

      return users.map(user => ({ ...user, avatar: null, whatsappMessage: null }));
    }
    throw error;
  }
}

/**
 * Get user by ID
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
        updatedAt: true,
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
          updatedAt: true,
        },
      });

      if (!user) {
        throw createError('USER_NOT_FOUND', 'User not found', 404);
      }

      return { ...user, avatar: null, whatsappMessage: null };
    }
    throw error;
  }
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput) {
  // Check if username already exists
  const existingUser = await prisma.user.findUnique({
    where: { username: input.username },
  });

  if (existingUser) {
    throw createError('USERNAME_EXISTS', 'Username already exists', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(input.password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      username: input.username,
      password: hashedPassword,
      role: input.role,
      avatar: input.avatar || null,
    },
    select: {
      id: true,
      username: true,
      role: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Update user
 */
export async function updateUser(userId: string, input: UpdateUserInput, currentUserId: string) {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw createError('USER_NOT_FOUND', 'User not found', 404);
  }

  // Prevent user from deleting themselves
  if (userId === currentUserId && input.role && input.role !== user.role) {
    throw createError('CANNOT_CHANGE_OWN_ROLE', 'You cannot change your own role', 400);
  }

  // Check if username is being changed and if it already exists
  if (input.username && input.username !== user.username) {
    const existingUser = await prisma.user.findUnique({
      where: { username: input.username },
    });

    if (existingUser) {
      throw createError('USERNAME_EXISTS', 'Username already exists', 400);
    }
  }

  // Prepare update data
  const updateData: any = {};

  if (input.username) {
    updateData.username = input.username;
  }

  if (input.role) {
    updateData.role = input.role;
  }

  if (input.password) {
    updateData.password = await bcrypt.hash(input.password, 10);
  }

  if (input.avatar !== undefined) {
    updateData.avatar = input.avatar;
  }

  if (input.whatsappMessage !== undefined) {
    updateData.whatsappMessage = input.whatsappMessage;
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      role: true,
      avatar: true,
      whatsappMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
}

/**
 * Delete user
 */
export async function deleteUser(userId: string, currentUserId: string) {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw createError('USER_NOT_FOUND', 'User not found', 404);
  }

  // Prevent user from deleting themselves
  if (userId === currentUserId) {
    throw createError('CANNOT_DELETE_SELF', 'You cannot delete your own account', 400);
  }

  // Delete user
  await prisma.user.delete({
    where: { id: userId },
  });

  return { success: true };
}
