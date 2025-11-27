/**
 * Create success response object
 */
export declare function createSuccessResponse<T>(data: T | null, message?: string): {
    success: true;
    data: T | null;
    message?: string;
};
