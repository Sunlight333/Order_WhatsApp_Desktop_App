import { z } from 'zod';
export declare const createOrderSchema: z.ZodObject<{
    customerName: z.ZodOptional<z.ZodString>;
    customerPhone: z.ZodString;
    observations: z.ZodOptional<z.ZodString>;
    suppliers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        supplierId: z.ZodOptional<z.ZodString>;
        products: z.ZodArray<z.ZodObject<{
            productRef: z.ZodString;
            productId: z.ZodOptional<z.ZodString>;
            quantity: z.ZodString;
            price: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            productRef: string;
            quantity: string;
            price: string;
            productId?: string | undefined;
        }, {
            productRef: string;
            quantity: string;
            price: string;
            productId?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        products: {
            productRef: string;
            quantity: string;
            price: string;
            productId?: string | undefined;
        }[];
        supplierId?: string | undefined;
    }, {
        name: string;
        products: {
            productRef: string;
            quantity: string;
            price: string;
            productId?: string | undefined;
        }[];
        supplierId?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    customerPhone: string;
    suppliers: {
        name: string;
        products: {
            productRef: string;
            quantity: string;
            price: string;
            productId?: string | undefined;
        }[];
        supplierId?: string | undefined;
    }[];
    customerName?: string | undefined;
    observations?: string | undefined;
}, {
    customerPhone: string;
    suppliers: {
        name: string;
        products: {
            productRef: string;
            quantity: string;
            price: string;
            productId?: string | undefined;
        }[];
        supplierId?: string | undefined;
    }[];
    customerName?: string | undefined;
    observations?: string | undefined;
}>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export declare const updateOrderSchema: z.ZodObject<{
    customerName: z.ZodOptional<z.ZodString>;
    customerPhone: z.ZodString;
    observations: z.ZodOptional<z.ZodString>;
    suppliers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        supplierId: z.ZodOptional<z.ZodString>;
        products: z.ZodArray<z.ZodObject<{
            productRef: z.ZodString;
            productId: z.ZodOptional<z.ZodString>;
            quantity: z.ZodString;
            price: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            productRef: string;
            quantity: string;
            price: string;
            productId?: string | undefined;
        }, {
            productRef: string;
            quantity: string;
            price: string;
            productId?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        products: {
            productRef: string;
            quantity: string;
            price: string;
            productId?: string | undefined;
        }[];
        supplierId?: string | undefined;
    }, {
        name: string;
        products: {
            productRef: string;
            quantity: string;
            price: string;
            productId?: string | undefined;
        }[];
        supplierId?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    customerPhone: string;
    suppliers: {
        name: string;
        products: {
            productRef: string;
            quantity: string;
            price: string;
            productId?: string | undefined;
        }[];
        supplierId?: string | undefined;
    }[];
    customerName?: string | undefined;
    observations?: string | undefined;
}, {
    customerPhone: string;
    suppliers: {
        name: string;
        products: {
            productRef: string;
            quantity: string;
            price: string;
            productId?: string | undefined;
        }[];
        supplierId?: string | undefined;
    }[];
    customerName?: string | undefined;
    observations?: string | undefined;
}>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
