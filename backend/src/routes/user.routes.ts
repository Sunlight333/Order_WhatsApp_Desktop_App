import { Router } from 'express';
import {
  listUsersController,
  getUserController,
  createUserController,
  updateUserController,
  deleteUserController,
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication and SUPER_ADMIN role
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

router.get('/', listUsersController);
router.get('/:id', getUserController);
router.post('/', createUserController);
router.put('/:id', updateUserController);
router.delete('/:id', deleteUserController);

export default router;
