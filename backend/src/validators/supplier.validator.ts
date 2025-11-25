import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(100, 'Supplier name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(100, 'Supplier name must be at most 100 characters').optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').optional().nullable(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
