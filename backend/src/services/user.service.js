"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.getUserById = getUserById;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
const database_1 = require("../config/database");
const error_util_1 = require("../utils/error.util");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = (0, database_1.getPrismaClient)();
/**
 * List all users
 */
async function listUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                avatar: true,
                whatsappMessage: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return users;
    }
    catch (error) {
        // If avatar or whatsappMessage column doesn't exist yet, query without them
        if (error.code === 'P2022' && (error.meta?.column?.includes('avatar') || error.meta?.column?.includes('whatsappMessage'))) {
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    username: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { createdAt: 'desc' },
            });
            return users.map(user => ({ ...user, avatar: null, whatsappMessage: null }));
        }
        throw error;
    }
}
/**
 * Get user by ID
 */
async function getUserById(userId) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                role: true,
                avatar: true,
                whatsappMessage: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            throw (0, error_util_1.createError)('USER_NOT_FOUND', 'User not found', 404);
        }
        return user;
    }
    catch (error) {
        // If avatar or whatsappMessage column doesn't exist yet, query without them
        if (error.code === 'P2022' && (error.meta?.column?.includes('avatar') || error.meta?.column?.includes('whatsappMessage'))) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    username: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            if (!user) {
                throw (0, error_util_1.createError)('USER_NOT_FOUND', 'User not found', 404);
            }
            return { ...user, avatar: null, whatsappMessage: null };
        }
        throw error;
    }
}
/**
 * Create a new user
 */
async function createUser(input) {
    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
        where: { username: input.username },
    });
    if (existingUser) {
        throw (0, error_util_1.createError)('USERNAME_EXISTS', 'Username already exists', 400);
    }
    // Hash password
    const hashedPassword = await bcrypt_1.default.hash(input.password, 10);
    // Create user
    const user = await prisma.user.create({
        data: {
            username: input.username,
            password: hashedPassword,
            role: input.role,
            avatar: input.avatar || null,
        },
        select: {
            id: true,
            username: true,
            role: true,
            avatar: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    return user;
}
/**
 * Update user
 */
async function updateUser(userId, input, currentUserId) {
    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw (0, error_util_1.createError)('USER_NOT_FOUND', 'User not found', 404);
    }
    // Prevent user from deleting themselves
    if (userId === currentUserId && input.role && input.role !== user.role) {
        throw (0, error_util_1.createError)('CANNOT_CHANGE_OWN_ROLE', 'You cannot change your own role', 400);
    }
    // Check if username is being changed and if it already exists
    if (input.username && input.username !== user.username) {
        const existingUser = await prisma.user.findUnique({
            where: { username: input.username },
        });
        if (existingUser) {
            throw (0, error_util_1.createError)('USERNAME_EXISTS', 'Username already exists', 400);
        }
    }
    // Prepare update data
    const updateData = {};
    if (input.username) {
        updateData.username = input.username;
    }
    if (input.role) {
        updateData.role = input.role;
    }
    if (input.password) {
        updateData.password = await bcrypt_1.default.hash(input.password, 10);
    }
    if (input.avatar !== undefined) {
        updateData.avatar = input.avatar;
    }
    if (input.whatsappMessage !== undefined) {
        updateData.whatsappMessage = input.whatsappMessage;
    }
    // Update user
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
            id: true,
            username: true,
            role: true,
            avatar: true,
            whatsappMessage: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    return updatedUser;
}
/**
 * Delete user
 */
async function deleteUser(userId, currentUserId) {
    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw (0, error_util_1.createError)('USER_NOT_FOUND', 'User not found', 404);
    }
    // Prevent user from deleting themselves
    if (userId === currentUserId) {
        throw (0, error_util_1.createError)('CANNOT_DELETE_SELF', 'You cannot delete your own account', 400);
    }
    // Delete user
    await prisma.user.delete({
        where: { id: userId },
    });
    return { success: true };
}
//# sourceMappingURL=user.service.js.map