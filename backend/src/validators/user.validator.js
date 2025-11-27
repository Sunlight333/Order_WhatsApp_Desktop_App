"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password must be at most 100 characters'),
    role: zod_1.z.enum(['SUPER_ADMIN', 'USER']).default('USER'),
    avatar: zod_1.z.string().nullable().optional(),
});
exports.updateUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters').optional(),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password must be at most 100 characters').optional(),
    role: zod_1.z.enum(['SUPER_ADMIN', 'USER']).optional(),
    avatar: zod_1.z.string().nullable().optional(),
    whatsappMessage: zod_1.z.string().nullable().optional(),
});
// Schema for users updating their own profile (no role changes)
exports.updateProfileSchema = zod_1.z.object({
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password must be at most 100 characters').optional(),
    avatar: zod_1.z.string().nullable().optional(),
    whatsappMessage: zod_1.z.string().nullable().optional(),
});
//# sourceMappingURL=user.validator.js.map