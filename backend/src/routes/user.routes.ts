import { Router } from 'express';
import {
  listUsersController,
  getUserController,
  createUserController,
  updateUserController,
  deleteUserController,
  uploadAvatarController,
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadAvatar } from '../middleware/upload.middleware';

const router = Router();

// All routes require authentication and SUPER_ADMIN role
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

router.get('/', listUsersController);
router.get('/:id', getUserController);
router.post('/', createUserController);
router.put('/:id', updateUserController);
router.delete('/:id', deleteUserController);
router.post('/:id/avatar', uploadAvatar.single('avatar'), uploadAvatarController);

export default router;
