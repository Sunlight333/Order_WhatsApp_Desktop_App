"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and get JWT token
 * @access  Public
 */
router.post('/login', auth_controller_1.loginController);
/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.meController);
/**
 * @route   PATCH /api/v1/auth/profile
 * @desc    Update current user's profile (password, avatar, whatsappMessage)
 * @access  Private
 */
router.patch('/profile', auth_middleware_1.authenticate, auth_controller_1.updateProfileController);
/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.logoutController);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map