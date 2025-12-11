import { z } from 'zod';

export const createOrderSchema = z.object({
  // orderNumber is auto-generated, not user-editable
  customerName: z.string().max(100).optional(),
  customerId: z.string().uuid().optional(), // Reference to existing customer
  customerPhone: z.string().max(20).optional(), // Optional now
  countryCode: z.string().max(10).optional().default('+34'), // Country code for phone
  observations: z.string().optional(),
  suppliers: z
    .array(
      z.object({
        name: z.string().min(1, 'Supplier name is required').max(100),
        supplierId: z.string().uuid().optional(),
        products: z
          .array(
            z.object({
              productRef: z.string().min(1, 'Product reference is required').max(100),
              productId: z.string().uuid().optional(),
              quantity: z.string().min(1, 'Quantity is required').max(50),
              price: z.string().min(1, 'Price is required').max(50),
            })
          )
          .min(1, 'At least one product is required per supplier'),
      })
    )
    .min(1, 'At least one supplier is required'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Update order schema (same as create)
export const updateOrderSchema = createOrderSchema;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

