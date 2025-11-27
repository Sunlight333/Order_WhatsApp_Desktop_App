"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginController = loginController;
exports.meController = meController;
exports.updateProfileController = updateProfileController;
exports.logoutController = logoutController;
const auth_validator_1 = require("../validators/auth.validator");
const auth_service_1 = require("../services/auth.service");
const user_service_1 = require("../services/user.service");
const user_validator_1 = require("../validators/user.validator");
const response_util_1 = require("../utils/response.util");
const error_util_1 = require("../utils/error.util");
/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
async function loginController(req, res) {
    try {
        // Validate input
        const validatedData = auth_validator_1.loginSchema.parse(req.body);
        // Authenticate user
        const result = await (0, auth_service_1.login)(validatedData.username, validatedData.password);
        res.status(200).json((0, response_util_1.createSuccessResponse)(result, 'Login successful'));
    }
    catch (error) {
        // Re-throw to be handled by error middleware
        throw error;
    }
}
/**
 * GET /api/v1/auth/me
 * Get current authenticated user information
 */
async function meController(req, res) {
    try {
        if (!req.user) {
            res.status(401).json((0, error_util_1.createErrorResponse)('UNAUTHORIZED', 'Authentication required'));
            return;
        }
        const user = await (0, auth_service_1.getUserById)(req.user.userId);
        res.status(200).json((0, response_util_1.createSuccessResponse)(user, 'User retrieved successfully'));
    }
    catch (error) {
        // Re-throw to be handled by error middleware
        throw error;
    }
}
/**
 * PATCH /api/v1/auth/profile
 * Update current user's profile (password, avatar, whatsappMessage)
 */
async function updateProfileController(req, res) {
    try {
        if (!req.user) {
            res.status(401).json((0, error_util_1.createErrorResponse)('UNAUTHORIZED', 'Authentication required'));
            return;
        }
        // Validate input (only allow profile fields, not role or username)
        const validatedData = user_validator_1.updateProfileSchema.parse(req.body);
        // Update user profile (restricted to own profile)
        const updatedUser = await (0, user_service_1.updateUser)(req.user.userId, validatedData, req.user.userId);
        res.status(200).json((0, response_util_1.createSuccessResponse)(updatedUser, 'Profile updated successfully'));
    }
    catch (error) {
        // Re-throw to be handled by error middleware
        throw error;
    }
}
/**
 * POST /api/v1/auth/logout
 * Logout user (client-side token removal)
 */
async function logoutController(req, res) {
    // Since we're using JWT, logout is handled client-side by removing the token
    // This endpoint is just for consistency
    res.status(200).json((0, response_util_1.createSuccessResponse)(null, 'Logout successful'));
}
//# sourceMappingURL=auth.controller.js.map