"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSuppliersController = listSuppliersController;
exports.getSupplierController = getSupplierController;
exports.createSupplierController = createSupplierController;
exports.updateSupplierController = updateSupplierController;
exports.deleteSupplierController = deleteSupplierController;
const supplier_service_1 = require("../services/supplier.service");
const supplier_validator_1 = require("../validators/supplier.validator");
const response_util_1 = require("../utils/response.util");
/**
 * GET /api/v1/suppliers
 * List all suppliers
 */
async function listSuppliersController(req, res) {
    try {
        const suppliers = await (0, supplier_service_1.listSuppliers)();
        res.status(200).json((0, response_util_1.createSuccessResponse)(suppliers));
    }
    catch (error) {
        throw error;
    }
}
/**
 * GET /api/v1/suppliers/:id
 * Get supplier by ID
 */
async function getSupplierController(req, res) {
    try {
        const { id } = req.params;
        const supplier = await (0, supplier_service_1.getSupplierById)(id);
        res.status(200).json((0, response_util_1.createSuccessResponse)(supplier));
    }
    catch (error) {
        throw error;
    }
}
/**
 * POST /api/v1/suppliers
 * Create a new supplier
 */
async function createSupplierController(req, res) {
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
        const validatedData = supplier_validator_1.createSupplierSchema.parse(req.body);
        const supplier = await (0, supplier_service_1.createSupplier)(validatedData);
        res.status(201).json((0, response_util_1.createSuccessResponse)(supplier, 'Supplier created successfully'));
    }
    catch (error) {
        throw error;
    }
}
/**
 * PUT /api/v1/suppliers/:id
 * Update supplier
 */
async function updateSupplierController(req, res) {
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
        const parsed = supplier_validator_1.updateSupplierSchema.parse(req.body);
        // Filter out null values to match UpdateSupplierInput type
        const validatedData = {
            ...(parsed.name !== undefined && { name: parsed.name }),
            ...(parsed.description !== null && parsed.description !== undefined && { description: parsed.description }),
        };
        const supplier = await (0, supplier_service_1.updateSupplier)(id, validatedData);
        res.status(200).json((0, response_util_1.createSuccessResponse)(supplier, 'Supplier updated successfully'));
    }
    catch (error) {
        throw error;
    }
}
/**
 * DELETE /api/v1/suppliers/:id
 * Delete supplier
 */
async function deleteSupplierController(req, res) {
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
        await (0, supplier_service_1.deleteSupplier)(id);
        res.status(200).json((0, response_util_1.createSuccessResponse)(null, 'Supplier deleted successfully'));
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=supplier.controller.js.map