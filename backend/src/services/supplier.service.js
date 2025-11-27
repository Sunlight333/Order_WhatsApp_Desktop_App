"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSuppliers = listSuppliers;
exports.getSupplierById = getSupplierById;
exports.createSupplier = createSupplier;
exports.updateSupplier = updateSupplier;
exports.deleteSupplier = deleteSupplier;
const database_1 = require("../config/database");
const error_util_1 = require("../utils/error.util");
const prisma = (0, database_1.getPrismaClient)();
/**
 * List all suppliers
 */
async function listSuppliers() {
    const suppliers = await prisma.supplier.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: {
                    products: true,
                    orderSuppliers: true,
                },
            },
        },
    });
    return suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        productsCount: s._count.products,
        ordersCount: s._count.orderSuppliers,
    }));
}
/**
 * Get supplier by ID
 */
async function getSupplierById(supplierId) {
    const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        include: {
            _count: {
                select: {
                    products: true,
                    orderSuppliers: true,
                },
            },
        },
    });
    if (!supplier) {
        throw (0, error_util_1.createError)('SUPPLIER_NOT_FOUND', 'Supplier not found', 404);
    }
    return {
        id: supplier.id,
        name: supplier.name,
        description: supplier.description,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
        productsCount: supplier._count.products,
        ordersCount: supplier._count.orderSuppliers,
    };
}
/**
 * Create a new supplier
 */
async function createSupplier(input) {
    // Check if supplier with same name already exists (case-insensitive)
    const existingSuppliers = await prisma.supplier.findMany();
    const exists = existingSuppliers.some((s) => s.name.toLowerCase() === input.name.trim().toLowerCase());
    if (exists) {
        throw (0, error_util_1.createError)('SUPPLIER_EXISTS', 'Supplier with this name already exists', 400);
    }
    const supplier = await prisma.supplier.create({
        data: {
            name: input.name.trim(),
            description: input.description?.trim(),
        },
    });
    return supplier;
}
/**
 * Update supplier
 */
async function updateSupplier(supplierId, input) {
    // Check if supplier exists
    const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
    });
    if (!supplier) {
        throw (0, error_util_1.createError)('SUPPLIER_NOT_FOUND', 'Supplier not found', 404);
    }
    // Check if name is being changed and if it conflicts
    if (input.name && input.name.trim().toLowerCase() !== supplier.name.toLowerCase()) {
        const existingSuppliers = await prisma.supplier.findMany();
        const exists = existingSuppliers.some((s) => s.id !== supplierId && s.name.toLowerCase() === (input.name?.trim().toLowerCase() ?? ''));
        if (exists) {
            throw (0, error_util_1.createError)('SUPPLIER_EXISTS', 'Supplier with this name already exists', 400);
        }
    }
    const updateData = {};
    if (input.name !== undefined) {
        updateData.name = input.name.trim();
    }
    if (input.description !== undefined) {
        updateData.description = input.description?.trim() || null;
    }
    const updatedSupplier = await prisma.supplier.update({
        where: { id: supplierId },
        data: updateData,
    });
    return updatedSupplier;
}
/**
 * Delete supplier
 */
async function deleteSupplier(supplierId) {
    // Check if supplier exists
    const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        include: {
            _count: {
                select: {
                    orderSuppliers: true,
                },
            },
        },
    });
    if (!supplier) {
        throw (0, error_util_1.createError)('SUPPLIER_NOT_FOUND', 'Supplier not found', 404);
    }
    // Check if supplier has orders (products can be deleted with cascade)
    if (supplier._count.orderSuppliers > 0) {
        throw (0, error_util_1.createError)('SUPPLIER_HAS_ORDERS', 'Cannot delete supplier that has orders. Remove all orders first.', 400);
    }
    await prisma.supplier.delete({
        where: { id: supplierId },
    });
    return { success: true };
}
//# sourceMappingURL=supplier.service.js.map