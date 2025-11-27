"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderSchema = exports.createOrderSchema = void 0;
const zod_1 = require("zod");
exports.createOrderSchema = zod_1.z.object({
    customerName: zod_1.z.string().max(100).optional(),
    customerPhone: zod_1.z.string().min(1, 'Customer phone is required').max(20),
    observations: zod_1.z.string().optional(),
    suppliers: zod_1.z
        .array(zod_1.z.object({
        name: zod_1.z.string().min(1, 'Supplier name is required').max(100),
        supplierId: zod_1.z.string().uuid().optional(),
        products: zod_1.z
            .array(zod_1.z.object({
            productRef: zod_1.z.string().min(1, 'Product reference is required').max(100),
            productId: zod_1.z.string().uuid().optional(),
            quantity: zod_1.z.string().min(1, 'Quantity is required').max(50),
            price: zod_1.z.string().min(1, 'Price is required').max(50),
        }))
            .min(1, 'At least one product is required per supplier'),
    }))
        .min(1, 'At least one supplier is required'),
});
// Update order schema (same as create)
exports.updateOrderSchema = exports.createOrderSchema;
//# sourceMappingURL=order.validator.js.map