"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.getUserById = getUserById;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../config/database");
const jwt_util_1 = require("../utils/jwt.util");
const error_util_1 = require("../utils/error.util");
const prisma = (0, database_1.getPrismaClient)();
/**
 * Authenticate user with username and password
 */
async function login(username, password) {
    // Find user by username
    const user = await prisma.user.findUnique({
        where: { username },
    });
    if (!user) {
        throw (0, error_util_1.createError)('INVALID_CREDENTIALS', 'Invalid username or password', 401);
    }
    // Verify password
    const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw (0, error_util_1.createError)('INVALID_CREDENTIALS', 'Invalid username or password', 401);
    }
    // Generate JWT token
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role,
    };
    const token = (0, jwt_util_1.generateToken)(payload);
    return {
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            avatar: user.avatar || null,
            whatsappMessage: user.whatsappMessage || null,
        },
        token,
    };
}
/**
 * Get user by ID (for token verification)
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
//# sourceMappingURL=auth.service.js.map