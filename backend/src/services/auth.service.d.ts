export interface LoginResult {
    user: {
        id: string;
        username: string;
        role: 'SUPER_ADMIN' | 'USER';
        avatar?: string | null;
        whatsappMessage?: string | null;
    };
    token: string;
}
/**
 * Authenticate user with username and password
 */
export declare function login(username: string, password: string): Promise<LoginResult>;
/**
 * Get user by ID (for token verification)
 */
export declare function getUserById(userId: string): Promise<{
    username: string;
    id: string;
    role: string;
    avatar: string | null;
    whatsappMessage: string | null;
    createdAt: Date;
}>;
