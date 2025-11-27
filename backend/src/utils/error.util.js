"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.createError = createError;
exports.createErrorResponse = createErrorResponse;
class ApiError extends Error {
    message;
    statusCode;
    code;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'ApiError';
        Error.captureStackTrace(this, this.constructor);
    }
    static badRequest(message, code = 'BAD_REQUEST') {
        return new ApiError(message, 400, code);
    }
    static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        return new ApiError(message, 401, code);
    }
    static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
        return new ApiError(message, 403, code);
    }
    static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
        return new ApiError(message, 404, code);
    }
    static conflict(message, code = 'CONFLICT') {
        return new ApiError(message, 409, code);
    }
}
exports.ApiError = ApiError;
/**
 * Create an error object for throwing
 */
function createError(code, message, statusCode = 400) {
    return new ApiError(message, statusCode, code);
}
/**
 * Create error response object
 */
function createErrorResponse(code, message, details) {
    return {
        success: false,
        error: {
            code,
            message,
            ...(details && { details }),
        },
    };
}
//# sourceMappingURL=error.util.js.map