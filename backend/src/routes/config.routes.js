"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_controller_1 = require("../controllers/config.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.get('/:key', auth_middleware_1.authenticate, config_controller_1.getConfigController);
router.put('/:key', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('SUPER_ADMIN'), config_controller_1.updateConfigController);
exports.default = router;
//# sourceMappingURL=config.routes.js.map