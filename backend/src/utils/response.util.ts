/**
 * Create success response object
 */
export function createSuccessResponse<T>(
  data: T | null,
  message?: string
): {
  success: true;
  data: T | null;
  message?: string;
} {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

