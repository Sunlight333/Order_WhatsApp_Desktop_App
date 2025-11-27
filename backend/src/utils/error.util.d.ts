export declare class ApiError extends Error {
    message: string;
    statusCode: number;
    code: string;
    constructor(message: string, statusCode?: number, code?: string);
    static badRequest(message: string, code?: string): ApiError;
    static unauthorized(message?: string, code?: string): ApiError;
    static forbidden(message?: string, code?: string): ApiError;
    static notFound(message?: string, code?: string): ApiError;
    static conflict(message: string, code?: string): ApiError;
}
/**
 * Create an error object for throwing
 */
export declare function createError(code: string, message: string, statusCode?: number): ApiError;
/**
 * Create error response object
 */
export declare function createErrorResponse(code: string, message: string, details?: any): {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
    };
};
