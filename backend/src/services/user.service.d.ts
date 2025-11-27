export interface CreateUserInput {
    username: string;
    password: string;
    role: 'SUPER_ADMIN' | 'USER';
    avatar?: string | null;
}
export interface UpdateUserInput {
    username?: string;
    password?: string;
    role?: 'SUPER_ADMIN' | 'USER';
    avatar?: string | null;
    whatsappMessage?: string | null;
}
/**
 * List all users
 */
export declare function listUsers(): Promise<{
    username: string;
    id: string;
    role: string;
    avatar: string | null;
    whatsappMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}[]>;
/**
 * Get user by ID
 */
export declare function getUserById(userId: string): Promise<{
    username: string;
    id: string;
    role: string;
    avatar: string | null;
    whatsappMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}>;
/**
 * Create a new user
 */
export declare function createUser(input: CreateUserInput): Promise<{
    username: string;
    id: string;
    role: string;
    avatar: string | null;
    createdAt: Date;
    updatedAt: Date;
}>;
/**
 * Update user
 */
export declare function updateUser(userId: string, input: UpdateUserInput, currentUserId: string): Promise<{
    username: string;
    id: string;
    role: string;
    avatar: string | null;
    whatsappMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}>;
/**
 * Delete user
 */
export declare function deleteUser(userId: string, currentUserId: string): Promise<{
    success: boolean;
}>;
