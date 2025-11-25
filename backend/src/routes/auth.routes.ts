import { Router } from 'express';
import { loginController, meController, logoutController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

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
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, logoutController);

export default router;

