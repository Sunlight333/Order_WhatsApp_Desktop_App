export interface CreateProductInput {
    supplierId: string;
    reference: string;
    description?: string;
    defaultPrice?: string;
}
export interface UpdateProductInput {
    reference?: string;
    description?: string;
    defaultPrice?: string;
}
/**
 * List products (optionally filtered by supplier)
 */
export declare function listProducts(supplierId?: string): Promise<({
    supplier: {
        id: string;
        name: string;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    supplierId: string;
    description: string | null;
    reference: string;
    defaultPrice: string | null;
})[]>;
/**
 * Get product by ID
 */
export declare function getProductById(productId: string): Promise<{
    supplier: {
        id: string;
        name: string;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    supplierId: string;
    description: string | null;
    reference: string;
    defaultPrice: string | null;
}>;
/**
 * Create a new product
 */
export declare function createProduct(input: CreateProductInput): Promise<{
    supplier: {
        id: string;
        name: string;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    supplierId: string;
    description: string | null;
    reference: string;
    defaultPrice: string | null;
}>;
/**
 * Update product
 */
export declare function updateProduct(productId: string, input: UpdateProductInput): Promise<{
    supplier: {
        id: string;
        name: string;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    supplierId: string;
    description: string | null;
    reference: string;
    defaultPrice: string | null;
}>;
/**
 * Delete product
 */
export declare function deleteProduct(productId: string): Promise<{
    success: boolean;
}>;
