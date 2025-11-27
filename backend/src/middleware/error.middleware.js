"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const error_util_1 = require("../utils/error.util");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const errorMiddleware = (error, req, res, next) => {
    console.error('Error:', {
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
    });
    // Handle known ApiError
    if (error instanceof error_util_1.ApiError) {
        res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
            },
        });
        return;
    }
    // Handle Zod validation errors
    if (error instanceof zod_1.ZodError) {
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: error.errors.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                })),
            },
        });
        return;
    }
    // Handle Prisma errors
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        handlePrismaError(error, res);
        return;
    }
    // Generic error
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
        },
    });
};
exports.errorMiddleware = errorMiddleware;
function handlePrismaError(error, res) {
    switch (error.code) {
        case 'P2002':
            res.status(409).json({
                success: false,
                error: {
                    code: 'UNIQUE_CONSTRAINT',
                    message: 'A record with this value already exists',
                },
            });
            break;
        case 'P2025':
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Record not found',
                },
            });
            break;
        default:
            res.status(500).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'A database error occurred',
                },
            });
    }
}
//# sourceMappingURL=error.middleware.js.map