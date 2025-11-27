"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
exports.createProductSchema = zod_1.z.object({
    supplierId: zod_1.z.string().uuid('Invalid supplier ID'),
    reference: zod_1.z.string().min(1, 'Product reference is required').max(100, 'Product reference must be at most 100 characters'),
    description: zod_1.z.string().max(500, 'Description must be at most 500 characters').optional(),
    defaultPrice: zod_1.z.string().max(50, 'Default price must be at most 50 characters').optional(),
});
exports.updateProductSchema = zod_1.z.object({
    reference: zod_1.z.string().min(1, 'Product reference is required').max(100, 'Product reference must be at most 100 characters').optional(),
    description: zod_1.z.string().max(500, 'Description must be at most 500 characters').optional().nullable(),
    defaultPrice: zod_1.z.string().max(50, 'Default price must be at most 50 characters').optional().nullable(),
});
//# sourceMappingURL=product.validator.js.map