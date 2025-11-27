"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProductsController = listProductsController;
exports.getProductController = getProductController;
exports.createProductController = createProductController;
exports.updateProductController = updateProductController;
exports.deleteProductController = deleteProductController;
const product_service_1 = require("../services/product.service");
const product_validator_1 = require("../validators/product.validator");
const response_util_1 = require("../utils/response.util");
/**
 * GET /api/v1/products
 * List products (optionally filtered by supplier)
 */
async function listProductsController(req, res) {
    try {
        const supplierId = req.query.supplierId;
        const products = await (0, product_service_1.listProducts)(supplierId);
        res.status(200).json((0, response_util_1.createSuccessResponse)(products));
    }
    catch (error) {
        throw error;
    }
}
/**
 * GET /api/v1/products/:id
 * Get product by ID
 */
async function getProductController(req, res) {
    try {
        const { id } = req.params;
        const product = await (0, product_service_1.getProductById)(id);
        res.status(200).json((0, response_util_1.createSuccessResponse)(product));
    }
    catch (error) {
        throw error;
    }
}
/**
 * POST /api/v1/products
 * Create a new product
 */
async function createProductController(req, res) {
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
        const validatedData = product_validator_1.createProductSchema.parse(req.body);
        const product = await (0, product_service_1.createProduct)(validatedData);
        res.status(201).json((0, response_util_1.createSuccessResponse)(product, 'Product created successfully'));
    }
    catch (error) {
        throw error;
    }
}
/**
 * PUT /api/v1/products/:id
 * Update product
 */
async function updateProductController(req, res) {
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
        const parsed = product_validator_1.updateProductSchema.parse(req.body);
        // Filter out null values to match UpdateProductInput type
        const validatedData = {
            ...(parsed.reference !== undefined && { reference: parsed.reference }),
            ...(parsed.description !== null && parsed.description !== undefined && { description: parsed.description }),
            ...(parsed.defaultPrice !== null && parsed.defaultPrice !== undefined && { defaultPrice: parsed.defaultPrice }),
        };
        const product = await (0, product_service_1.updateProduct)(id, validatedData);
        res.status(200).json((0, response_util_1.createSuccessResponse)(product, 'Product updated successfully'));
    }
    catch (error) {
        throw error;
    }
}
/**
 * DELETE /api/v1/products/:id
 * Delete product
 */
async function deleteProductController(req, res) {
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
        await (0, product_service_1.deleteProduct)(id);
        res.status(200).json((0, response_util_1.createSuccessResponse)(null, 'Product deleted successfully'));
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=product.controller.js.map