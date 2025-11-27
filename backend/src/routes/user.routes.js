"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
// All routes require authentication and SUPER_ADMIN role
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('SUPER_ADMIN'));
router.get('/', user_controller_1.listUsersController);
router.get('/:id', user_controller_1.getUserController);
router.post('/', user_controller_1.createUserController);
router.put('/:id', user_controller_1.updateUserController);
router.delete('/:id', user_controller_1.deleteUserController);
router.post('/:id/avatar', upload_middleware_1.uploadAvatar.single('avatar'), user_controller_1.uploadAvatarController);
exports.default = router;
//# sourceMappingURL=user.routes.js.map