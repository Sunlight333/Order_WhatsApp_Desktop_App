"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// List is available to all authenticated users (for autocomplete)
router.get('/', auth_middleware_1.authenticate, product_controller_1.listProductsController);
router.get('/:id', auth_middleware_1.authenticate, product_controller_1.getProductController);
// CRUD operations require SUPER_ADMIN
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('SUPER_ADMIN'), product_controller_1.createProductController);
router.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('SUPER_ADMIN'), product_controller_1.updateProductController);
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('SUPER_ADMIN'), product_controller_1.deleteProductController);
exports.default = router;
//# sourceMappingURL=product.routes.js.map