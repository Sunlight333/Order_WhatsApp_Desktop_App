// Shared TypeScript types for the application

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  USER = 'USER',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  NOTIFIED_CALL = 'NOTIFIED_CALL',
  NOTIFIED_WHATSAPP = 'NOTIFIED_WHATSAPP',
}

export enum NotificationMethod {
  CALL = 'CALL',
  WHATSAPP = 'WHATSAPP',
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  supplierId: string;
  reference: string;
  description?: string;
  defaultPrice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderProduct {
  id: string;
  orderId: string;
  supplierId: string;
  supplierName?: string;
  productRef: string;
  quantity: string;
  price: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  customerName?: string;
  customerPhone: string;
  status: OrderStatus;
  notificationMethod?: NotificationMethod;
  observations?: string;
  createdBy: {
    id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
  notifiedAt?: string;
  suppliers: Array<{
    id: string;
    name: string;
  }>;
  products: OrderProduct[];
  totalAmount?: string;
}

export interface CreateOrderDto {
  customerName?: string;
  customerPhone: string;
  observations?: string;
  suppliers: Array<{
    supplierId: string;
    products: Array<{
      productRef: string;
      quantity: string;
      price: string;
    }>;
  }>;
}

export interface OrderFilters {
  search?: string;
  status?: OrderStatus;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  page?: number;
  limit?: number;
}

export interface AuditLog {
  id: string;
  orderId: string;
  userId: string;
  user?: {
    id: string;
    username: string;
  };
  action: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

