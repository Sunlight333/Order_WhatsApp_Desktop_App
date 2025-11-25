import { z } from 'zod';

export const createProductSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID'),
  reference: z.string().min(1, 'Product reference is required').max(100, 'Product reference must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  defaultPrice: z.string().max(50, 'Default price must be at most 50 characters').optional(),
});

export const updateProductSchema = z.object({
  reference: z.string().min(1, 'Product reference is required').max(100, 'Product reference must be at most 100 characters').optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').optional().nullable(),
  defaultPrice: z.string().max(50, 'Default price must be at most 50 characters').optional().nullable(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
