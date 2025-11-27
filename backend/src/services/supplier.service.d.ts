export interface CreateSupplierInput {
    name: string;
    description?: string;
}
export interface UpdateSupplierInput {
    name?: string;
    description?: string;
}
/**
 * List all suppliers
 */
export declare function listSuppliers(): Promise<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    productsCount: number;
    ordersCount: number;
}[]>;
/**
 * Get supplier by ID
 */
export declare function getSupplierById(supplierId: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    productsCount: number;
    ordersCount: number;
}>;
/**
 * Create a new supplier
 */
export declare function createSupplier(input: CreateSupplierInput): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    description: string | null;
}>;
/**
 * Update supplier
 */
export declare function updateSupplier(supplierId: string, input: UpdateSupplierInput): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    description: string | null;
}>;
/**
 * Delete supplier
 */
export declare function deleteSupplier(supplierId: string): Promise<{
    success: boolean;
}>;
