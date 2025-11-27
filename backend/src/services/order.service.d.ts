export interface CreateOrderInput {
    customerName?: string;
    customerPhone: string;
    observations?: string;
    suppliers: Array<{
        name: string;
        supplierId?: string;
        products: Array<{
            productRef: string;
            productId?: string;
            quantity: string;
            price: string;
        }>;
    }>;
}
export interface UpdateOrderInput {
    customerName?: string;
    customerPhone: string;
    observations?: string;
    suppliers: Array<{
        name: string;
        supplierId?: string;
        products: Array<{
            productRef: string;
            productId?: string;
            quantity: string;
            price: string;
        }>;
    }>;
}
/**
 * Create a new order
 */
export declare function createOrder(userId: string, input: CreateOrderInput): Promise<{
    totalAmount: string;
    suppliers: {
        id: string;
        name: string;
    }[];
    auditLogs: ({
        user: {
            username: string;
        };
    } & {
        id: string;
        timestamp: Date;
        orderId: string;
        userId: string;
        action: string;
        fieldChanged: string | null;
        oldValue: string | null;
        newValue: string | null;
        metadata: string | null;
    })[];
    products: ({
        supplier: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        supplierId: string;
        productRef: string;
        quantity: string;
        price: string;
        orderId: string;
    })[];
    createdBy: {
        username: string;
        id: string;
    };
    status: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    customerName: string | null;
    customerPhone: string;
    observations: string | null;
    notificationMethod: string | null;
    notifiedAt: Date | null;
    createdById: string;
}>;
/**
 * Update order status
 */
export declare function updateOrderStatus(orderId: string, userId: string, status: string, notificationMethod?: string): Promise<{
    totalAmount: string;
    suppliers: {
        id: string;
        name: string;
    }[];
    auditLogs: ({
        user: {
            username: string;
        };
    } & {
        id: string;
        timestamp: Date;
        orderId: string;
        userId: string;
        action: string;
        fieldChanged: string | null;
        oldValue: string | null;
        newValue: string | null;
        metadata: string | null;
    })[];
    products: ({
        supplier: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        supplierId: string;
        productRef: string;
        quantity: string;
        price: string;
        orderId: string;
    })[];
    createdBy: {
        username: string;
        id: string;
    };
    status: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    customerName: string | null;
    customerPhone: string;
    observations: string | null;
    notificationMethod: string | null;
    notifiedAt: Date | null;
    createdById: string;
}>;
/**
 * Get order by ID
 */
export declare function getOrderById(orderId: string): Promise<{
    totalAmount: string;
    suppliers: {
        id: string;
        name: string;
    }[];
    auditLogs: ({
        user: {
            username: string;
        };
    } & {
        id: string;
        timestamp: Date;
        orderId: string;
        userId: string;
        action: string;
        fieldChanged: string | null;
        oldValue: string | null;
        newValue: string | null;
        metadata: string | null;
    })[];
    products: ({
        supplier: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        supplierId: string;
        productRef: string;
        quantity: string;
        price: string;
        orderId: string;
    })[];
    createdBy: {
        username: string;
        id: string;
    };
    status: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    customerName: string | null;
    customerPhone: string;
    observations: string | null;
    notificationMethod: string | null;
    notifiedAt: Date | null;
    createdById: string;
}>;
/**
 * List orders with pagination and filters
 */
export declare function listOrders(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}): Promise<{
    orders: {
        totalAmount: string;
        suppliers: {
            id: string;
            name: string;
        }[];
        products: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            supplierId: string;
            productRef: string;
            quantity: string;
            price: string;
            orderId: string;
        }[];
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        customerName: string | null;
        customerPhone: string;
        observations: string | null;
        notificationMethod: string | null;
        notifiedAt: Date | null;
        createdById: string;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
/**
 * Update an existing order
 */
export declare function updateOrder(orderId: string, userId: string, input: UpdateOrderInput): Promise<{
    totalAmount: string;
    suppliers: {
        id: string;
        name: string;
    }[];
    auditLogs: ({
        user: {
            username: string;
        };
    } & {
        id: string;
        timestamp: Date;
        orderId: string;
        userId: string;
        action: string;
        fieldChanged: string | null;
        oldValue: string | null;
        newValue: string | null;
        metadata: string | null;
    })[];
    products: ({
        supplier: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        supplierId: string;
        productRef: string;
        quantity: string;
        price: string;
        orderId: string;
    })[];
    createdBy: {
        username: string;
        id: string;
    };
    status: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    customerName: string | null;
    customerPhone: string;
    observations: string | null;
    notificationMethod: string | null;
    notifiedAt: Date | null;
    createdById: string;
}>;
