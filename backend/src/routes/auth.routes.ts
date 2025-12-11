import { Router } from 'express';
import { loginController, meController, updateProfileController, uploadProfileAvatarController, logoutController, verifyAdminPasswordController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadAvatar } from '../middleware/upload.middleware';

const router = Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and get JWT token
 * @access  Public
 */
router.post('/login', loginController);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticate, meController);

/**
 * @route   PATCH /api/v1/auth/profile
 * @desc    Update current user's profile (username, password, avatar, whatsappMessage)
 * @access  Private
 */
router.patch('/profile', authenticate, updateProfileController);

/**
 * @route   POST /api/v1/auth/profile/avatar
 * @desc    Upload current user's avatar
 * @access  Private
 */
router.post('/profile/avatar', authenticate, uploadAvatar.single('avatar'), uploadProfileAvatarController);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, logoutController);

/**
 * @route   POST /api/v1/auth/verify-admin-password
 * @desc    Verify admin password for accessing protected settings
 * @access  Private
 */
router.post('/verify-admin-password', authenticate, verifyAdminPasswordController);

export default router;

