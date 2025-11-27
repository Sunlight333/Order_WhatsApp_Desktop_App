"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSupplierSchema = exports.createSupplierSchema = void 0;
const zod_1 = require("zod");
exports.createSupplierSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Supplier name is required').max(100, 'Supplier name must be at most 100 characters'),
    description: zod_1.z.string().max(500, 'Description must be at most 500 characters').optional(),
});
exports.updateSupplierSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Supplier name is required').max(100, 'Supplier name must be at most 100 characters').optional(),
    description: zod_1.z.string().max(500, 'Description must be at most 500 characters').optional().nullable(),
});
//# sourceMappingURL=supplier.validator.js.map