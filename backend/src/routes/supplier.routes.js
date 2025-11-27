"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supplier_controller_1 = require("../controllers/supplier.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// List is available to all authenticated users (for autocomplete)
router.get('/', auth_middleware_1.authenticate, supplier_controller_1.listSuppliersController);
router.get('/:id', auth_middleware_1.authenticate, supplier_controller_1.getSupplierController);
// CRUD operations require SUPER_ADMIN
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('SUPER_ADMIN'), supplier_controller_1.createSupplierController);
router.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('SUPER_ADMIN'), supplier_controller_1.updateSupplierController);
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('SUPER_ADMIN'), supplier_controller_1.deleteSupplierController);
exports.default = router;
//# sourceMappingURL=supplier.routes.js.map