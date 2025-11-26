import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password must be at most 100 characters'),
  role: z.enum(['SUPER_ADMIN', 'USER']).default('USER'),
  avatar: z.string().nullable().optional(),
});

export const updateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password must be at most 100 characters').optional(),
  role: z.enum(['SUPER_ADMIN', 'USER']).optional(),
  avatar: z.string().nullable().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
