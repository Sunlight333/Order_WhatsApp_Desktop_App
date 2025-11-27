import { z } from 'zod';
export declare const createProductSchema: z.ZodObject<{
    supplierId: z.ZodString;
    reference: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    defaultPrice: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    supplierId: string;
    reference: string;
    description?: string | undefined;
    defaultPrice?: string | undefined;
}, {
    supplierId: string;
    reference: string;
    description?: string | undefined;
    defaultPrice?: string | undefined;
}>;
export declare const updateProductSchema: z.ZodObject<{
    reference: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    defaultPrice: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description?: string | null | undefined;
    reference?: string | undefined;
    defaultPrice?: string | null | undefined;
}, {
    description?: string | null | undefined;
    reference?: string | undefined;
    defaultPrice?: string | null | undefined;
}>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
