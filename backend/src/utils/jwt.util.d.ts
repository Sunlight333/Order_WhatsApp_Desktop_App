export interface JWTPayload {
    userId: string;
    username: string;
    role: 'SUPER_ADMIN' | 'USER';
}
/**
 * Generate a JWT token for a user
 */
export declare function generateToken(payload: JWTPayload): string;
/**
 * Verify and decode a JWT token
 */
export declare function verifyToken(token: string): JWTPayload;
/**
 * Extract token from Authorization header
 */
export declare function extractTokenFromHeader(authHeader: string | undefined): string | null;
