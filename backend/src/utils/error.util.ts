export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code: string = 'BAD_REQUEST'): ApiError {
    return new ApiError(message, 400, code);
  }

  static unauthorized(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED'): ApiError {
    return new ApiError(message, 401, code);
  }

  static forbidden(message: string = 'Forbidden', code: string = 'FORBIDDEN'): ApiError {
    return new ApiError(message, 403, code);
  }

  static notFound(message: string = 'Resource not found', code: string = 'NOT_FOUND'): ApiError {
    return new ApiError(message, 404, code);
  }

  static conflict(message: string, code: string = 'CONFLICT'): ApiError {
    return new ApiError(message, 409, code);
  }
}

/**
 * Create an error object for throwing
 */
export function createError(
  code: string,
  message: string,
  statusCode: number = 400
): ApiError {
  return new ApiError(message, statusCode, code);
}

/**
 * Create error response object
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any
): {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
} {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

