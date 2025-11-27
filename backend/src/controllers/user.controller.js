"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsersController = listUsersController;
exports.getUserController = getUserController;
exports.createUserController = createUserController;
exports.updateUserController = updateUserController;
exports.deleteUserController = deleteUserController;
exports.uploadAvatarController = uploadAvatarController;
const user_validator_1 = require("../validators/user.validator");
const user_service_1 = require("../services/user.service");
const response_util_1 = require("../utils/response.util");
const upload_middleware_1 = require("../middleware/upload.middleware");
const path_1 = __importDefault(require("path"));
/**
 * GET /api/v1/users
 * List all users
 */
async function listUsersController(req, res) {
    try {
        const users = await (0, user_service_1.listUsers)();
        res.status(200).json((0, response_util_1.createSuccessResponse)(users));
    }
    catch (error) {
        throw error;
    }
}
/**
 * GET /api/v1/users/:id
 * Get user by ID
 */
async function getUserController(req, res) {
    try {
        const { id } = req.params;
        const user = await (0, user_service_1.getUserById)(id);
        res.status(200).json((0, response_util_1.createSuccessResponse)(user));
    }
    catch (error) {
        throw error;
    }
}
/**
 * POST /api/v1/users
 * Create a new user
 */
async function createUserController(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        const validatedData = user_validator_1.createUserSchema.parse(req.body);
        const user = await (0, user_service_1.createUser)(validatedData);
        res.status(201).json((0, response_util_1.createSuccessResponse)(user, 'User created successfully'));
    }
    catch (error) {
        throw error;
    }
}
/**
 * PUT /api/v1/users/:id
 * Update user
 */
async function updateUserController(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        const { id } = req.params;
        const validatedData = user_validator_1.updateUserSchema.parse(req.body);
        const user = await (0, user_service_1.updateUser)(id, validatedData, req.user.userId);
        res.status(200).json((0, response_util_1.createSuccessResponse)(user, 'User updated successfully'));
    }
    catch (error) {
        throw error;
    }
}
/**
 * DELETE /api/v1/users/:id
 * Delete user
 */
async function deleteUserController(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        const { id } = req.params;
        await (0, user_service_1.deleteUser)(id, req.user.userId);
        res.status(200).json((0, response_util_1.createSuccessResponse)(null, 'User deleted successfully'));
    }
    catch (error) {
        throw error;
    }
}
/**
 * POST /api/v1/users/:id/avatar
 * Upload user avatar
 */
async function uploadAvatarController(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        const { id } = req.params;
        const file = req.file;
        if (!file) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'NO_FILE',
                    message: 'No file uploaded',
                },
            });
            return;
        }
        // Get just the filename (not full path)
        const filename = path_1.default.basename(file.path);
        const avatarUrl = (0, upload_middleware_1.getAvatarUrl)(filename);
        // Update user with avatar
        const updateData = { avatar: avatarUrl };
        const user = await (0, user_service_1.updateUser)(id, updateData, req.user.userId);
        res.status(200).json((0, response_util_1.createSuccessResponse)(user, 'Avatar uploaded successfully'));
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=user.controller.js.map