import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Username is too long'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

