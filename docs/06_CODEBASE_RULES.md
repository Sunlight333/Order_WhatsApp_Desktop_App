# Codebase Rules & Standards
## Order Management Desktop Application

### Version: 1.0

---

## 1. General Principles

### 1.1 Code Quality Standards
- **Clean Code**: Code should be readable, maintainable, and self-documenting
- **DRY Principle**: Don't Repeat Yourself - extract reusable code
- **SOLID Principles**: Follow object-oriented design principles
- **KISS Principle**: Keep It Simple, Stupid - avoid unnecessary complexity
- **Consistency**: Follow established patterns throughout the codebase

### 1.2 Professional Standards
- **Type Safety**: Use TypeScript strictly (no `any` types without justification)
- **Error Handling**: Always handle errors explicitly
- **Validation**: Validate all user inputs and API responses
- **Security**: Never expose sensitive data, always sanitize inputs
- **Performance**: Write efficient code, optimize where necessary

---

## 2. Project Structure

### 2.1 Root Directory Structure
```
Order_WhatsApp_Desktop_App/
├── backend/                 # Express.js backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # Prisma models (optional)
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   ├── validators/     # Input validation schemas
│   │   └── app.ts          # Express app setup
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Database migrations
│   ├── tests/              # Backend tests
│   ├── .env.example        # Environment variables template
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # React + Electron frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── common/     # Generic components (Button, Input, etc.)
│   │   │   ├── orders/     # Order-specific components
│   │   │   ├── suppliers/  # Supplier-specific components
│   │   │   └── layout/     # Layout components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # State management (Redux/Context)
│   │   ├── services/       # API service functions
│   │   ├── utils/          # Utility functions
│   │   ├── types/          # TypeScript type definitions
│   │   ├── constants/      # Application constants
│   │   ├── styles/         # Global styles
│   │   └── App.tsx         # Main App component
│   ├── electron/           # Electron main process
│   │   ├── main.ts         # Main process entry
│   │   └── preload.ts      # Preload script
│   ├── public/             # Static assets
│   ├── tests/              # Frontend tests
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                   # Documentation
│   ├── 01_PROJECT_REQUIREMENTS.md
│   ├── 02_SYSTEM_ARCHITECTURE.md
│   ├── 03_API_DESIGN.md
│   ├── 04_DEVELOPMENT_ROADMAP.md
│   ├── 05_UI_UX_GUIDELINES.md
│   └── 06_CODEBASE_RULES.md
│
├── .gitignore
├── README.md
└── package.json           # Root package.json (optional)
```

---

## 3. Backend Code Standards

### 3.1 File Naming Conventions
- **Files**: Use kebab-case (e.g., `order-controller.ts`, `auth-middleware.ts`)
- **Classes**: Use PascalCase (e.g., `OrderController`, `AuthService`)
- **Functions/Variables**: Use camelCase (e.g., `createOrder`, `userId`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`, `API_BASE_URL`)

### 3.2 Folder Structure Rules
```
backend/src/
├── controllers/
│   ├── order.controller.ts
│   ├── user.controller.ts
│   └── supplier.controller.ts
├── services/
│   ├── order.service.ts
│   ├── user.service.ts
│   └── audit-log.service.ts
├── routes/
│   ├── order.routes.ts
│   ├── user.routes.ts
│   └── index.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   └── validation.middleware.ts
└── utils/
    ├── logger.ts
    ├── hash.util.ts
    └── response.util.ts
```

### 3.3 Controller Pattern
```typescript
// order.controller.ts
import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { ApiResponse } from '../utils/response.util';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Create a new order
   * POST /api/v1/orders
   */
  createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id; // From auth middleware
      const orderData = req.body;

      const order = await this.orderService.createOrder(userId, orderData);
      
      ApiResponse.success(res, order, 'Order created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get order list with filters
   * GET /api/v1/orders
   */
  getOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const filters = req.query;
      const result = await this.orderService.getOrders(filters);
      
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
```

### 3.4 Service Pattern
```typescript
// order.service.ts
import { PrismaClient } from '@prisma/client';
import { AuditLogService } from './audit-log.service';
import { CreateOrderDto } from '../types/order.types';

export class OrderService {
  private prisma: PrismaClient;
  private auditLogService: AuditLogService;

  constructor() {
    this.prisma = new PrismaClient();
    this.auditLogService = new AuditLogService();
  }

  async createOrder(userId: string, data: CreateOrderDto) {
    // Use transaction for data consistency
    return await this.prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          status: 'PENDING',
          createdById: userId,
          // ... other fields
        },
      });

      // Create suppliers and products
      // ...

      // Create audit log
      await this.auditLogService.logAction({
        orderId: order.id,
        userId,
        action: 'CREATE',
      });

      return order;
    });
  }

  async getOrders(filters: any) {
    // Build query with filters
    const where = this.buildWhereClause(filters);
    
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          createdBy: { select: { id: true, username: true } },
          suppliers: { include: { supplier: true } },
          products: { include: { supplier: true } },
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  private buildWhereClause(filters: any) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { customerPhone: { contains: filters.search } },
        { id: { equals: filters.search } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // ... more filters

    return where;
  }
}
```

### 3.5 Route Pattern
```typescript
// order.routes.ts
import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { createOrderSchema } from '../validators/order.validator';

const router = Router();
const orderController = new OrderController();

// All routes require authentication
router.use(authMiddleware);

// GET /api/v1/orders
router.get('/', orderController.getOrders);

// GET /api/v1/orders/:id
router.get('/:id', orderController.getOrderById);

// POST /api/v1/orders
router.post(
  '/',
  validateRequest(createOrderSchema),
  orderController.createOrder
);

// PUT /api/v1/orders/:id
router.put(
  '/:id',
  validateRequest(updateOrderSchema),
  orderController.updateOrder
);

export default router;
```

### 3.6 Middleware Pattern
```typescript
// auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { ApiError } from '../utils/error.util';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new ApiError('Authentication required', 401);
    }

    const decoded = verifyToken(token);
    req.user = decoded; // Attach user to request
    next();
  } catch (error) {
    next(new ApiError('Invalid or expired token', 401));
  }
};
```

### 3.7 Error Handling
```typescript
// error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/error.util';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logger.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Handle known errors
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(error, res);
    return;
  }

  // Generic error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
```

### 3.8 Validation Pattern
```typescript
// validators/order.validator.ts
import { z } from 'zod';

export const createOrderSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().min(1, 'Phone number is required'),
  observations: z.string().optional(),
  suppliers: z.array(
    z.object({
      supplierId: z.string().uuid('Invalid supplier ID'),
      products: z.array(
        z.object({
          productRef: z.string().min(1, 'Product reference required'),
          quantity: z.string().min(1, 'Quantity required'),
          price: z.string().min(1, 'Price required'),
        })
      ).min(1, 'At least one product required'),
    })
  ).min(1, 'At least one supplier required'),
});
```

---

## 4. Frontend Code Standards

### 4.1 File Naming Conventions
- **Components**: PascalCase (e.g., `OrderList.tsx`, `CreateOrderForm.tsx`)
- **Hooks**: camelCase with "use" prefix (e.g., `useOrders.ts`, `useAuth.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`, `apiClient.ts`)
- **Types**: PascalCase (e.g., `Order.types.ts`, `User.types.ts`)
- **Constants**: UPPER_SNAKE_CASE files (e.g., `API_ENDPOINTS.ts`)

### 4.2 Component Structure
```typescript
// components/orders/OrderList.tsx
import React, { useState, useEffect } from 'react';
import { Order } from '../../types/Order.types';
import { OrderService } from '../../services/order.service';
import { OrderListItem } from './OrderListItem';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

interface OrderListProps {
  filters?: OrderFilters;
  onOrderClick?: (order: Order) => void;
}

/**
 * OrderList component displays a list of orders with filtering and search
 */
export const OrderList: React.FC<OrderListProps> = ({ 
  filters, 
  onOrderClick 
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await OrderService.getOrders(filters);
      setOrders(data.orders);
      setError(null);
    } catch (err) {
      setError('Failed to load orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (orders.length === 0) {
    return <EmptyState message="No orders found" />;
  }

  return (
    <div className="order-list">
      {orders.map((order) => (
        <OrderListItem
          key={order.id}
          order={order}
          onClick={() => onOrderClick?.(order)}
        />
      ))}
    </div>
  );
};
```

### 4.3 Custom Hooks Pattern
```typescript
// hooks/useOrders.ts
import { useState, useEffect } from 'react';
import { Order, OrderFilters } from '../types/Order.types';
import { OrderService } from '../services/order.service';

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useOrders = (filters?: OrderFilters): UseOrdersReturn => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await OrderService.getOrders(filters);
      setOrders(data.orders);
    } catch (err) {
      setError('Failed to fetch orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
  };
};
```

### 4.4 Service/API Client Pattern
```typescript
// services/order.service.ts
import { apiClient } from '../utils/apiClient';
import { Order, CreateOrderDto, OrderFilters } from '../types/Order.types';

export class OrderService {
  private static readonly ENDPOINT = '/api/v1/orders';

  static async getOrders(filters?: OrderFilters): Promise<{
    orders: Order[];
    pagination: Pagination;
  }> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, String(value));
        }
      });
    }

    const response = await apiClient.get(
      `${this.ENDPOINT}?${params.toString()}`
    );
    return response.data.data;
  }

  static async getOrderById(id: string): Promise<Order> {
    const response = await apiClient.get(`${this.ENDPOINT}/${id}`);
    return response.data.data;
  }

  static async createOrder(data: CreateOrderDto): Promise<Order> {
    const response = await apiClient.post(this.ENDPOINT, data);
    return response.data.data;
  }

  static async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    const response = await apiClient.put(`${this.ENDPOINT}/${id}`, data);
    return response.data.data;
  }

  static async updateOrderStatus(
    id: string,
    status: OrderStatus,
    method?: NotificationMethod
  ): Promise<Order> {
    const response = await apiClient.patch(`${this.ENDPOINT}/${id}/status`, {
      status,
      notificationMethod: method,
    });
    return response.data.data;
  }
}
```

### 4.5 TypeScript Types
```typescript
// types/Order.types.ts
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
  products: Array<{
    id: string;
    supplierId: string;
    supplierName: string;
    productRef: string;
    quantity: string;
    price: string;
  }>;
  totalAmount: string;
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
  page?: number;
  limit?: number;
}
```

---

## 5. Database Standards

### 5.1 Prisma Schema Rules
- **Always use UUID for primary keys**: `@id @default(uuid())`
- **Use proper field types**: String, Int, DateTime, Boolean, etc.
- **Add indexes** for frequently queried fields
- **Use relations** instead of manual foreign keys where possible
- **Add comments** to explain complex relationships
- **Use enums** for fixed value sets (status, roles, etc.)

### 5.2 Migration Guidelines
- **Always review migrations** before applying
- **Test migrations** on development database first
- **Never edit applied migrations** - create new ones instead
- **Use descriptive migration names**: `add_order_status_index`
- **Backup database** before production migrations

### 5.3 Query Optimization
- **Use `include`** instead of multiple queries
- **Select only needed fields**: `select: { id: true, name: true }`
- **Use pagination** for large result sets
- **Add indexes** for WHERE and ORDER BY clauses
- **Use transactions** for related operations

---

## 6. Testing Standards

### 6.1 Test Structure
```
tests/
├── unit/              # Unit tests
│   ├── services/
│   ├── utils/
│   └── controllers/
├── integration/       # Integration tests
│   └── api/
└── e2e/              # End-to-end tests
```

### 6.2 Testing Rules
- **Write tests** for all business logic
- **Test edge cases** and error scenarios
- **Mock external dependencies** (database, APIs)
- **Use descriptive test names**: `should return error when phone is invalid`
- **Keep tests independent** - no shared state
- **Maintain test coverage** above 80%

### 6.3 Example Test
```typescript
// tests/unit/services/order.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { OrderService } from '../../../src/services/order.service';

describe('OrderService', () => {
  let orderService: OrderService;

  beforeEach(() => {
    orderService = new OrderService();
  });

  describe('createOrder', () => {
    it('should create order with valid data', async () => {
      const orderData = {
        customerPhone: '+34123456789',
        suppliers: [
          {
            supplierId: 'uuid',
            products: [
              { productRef: 'REF-123', quantity: '2', price: '10.00' },
            ],
          },
        ],
      };

      const order = await orderService.createOrder('userId', orderData);

      expect(order).toBeDefined();
      expect(order.customerPhone).toBe(orderData.customerPhone);
      expect(order.status).toBe('PENDING');
    });

    it('should throw error when phone is missing', async () => {
      const orderData = {
        customerPhone: '',
        suppliers: [],
      };

      await expect(
        orderService.createOrder('userId', orderData)
      ).rejects.toThrow();
    });
  });
});
```

---

## 7. Git & Version Control

### 7.1 Branch Naming
- **Feature**: `feature/order-list-view`
- **Bugfix**: `bugfix/fix-phone-validation`
- **Hotfix**: `hotfix/critical-auth-fix`
- **Refactor**: `refactor/extract-order-service`

### 7.2 Commit Messages
Use conventional commits format:
```
feat: add order status update functionality
fix: resolve phone number validation issue
refactor: extract order service logic
docs: update API documentation
test: add tests for order creation
chore: update dependencies
```

### 7.3 Commit Guidelines
- **One logical change per commit**
- **Write clear, descriptive commit messages**
- **Keep commits atomic** - don't mix unrelated changes
- **Review before committing** - use `git diff`

---

## 8. Environment Configuration

### 8.1 Environment Variables
Always use `.env` files (never commit actual `.env`):
```bash
# Backend .env
DATABASE_URL="postgresql://user:password@localhost:5432/order_db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="24h"
NODE_ENV="development"
PORT=3000

# Frontend .env
VITE_API_BASE_URL="http://localhost:3000/api/v1"
```

### 8.2 Configuration Management
```typescript
// config/database.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

// config/env.ts
export const env = {
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};
```

---

## 9. User Feedback & Notifications

### 9.1 Toast Notifications (Required)
- ✅ **Always use toast notifications** instead of browser alerts
- ✅ Use appropriate toast type: `success`, `error`, `warning`, `info`
- ✅ Provide clear, actionable messages
- ✅ Include descriptions for complex errors

```typescript
// ✅ Good
toast.success('Order created successfully');

// ❌ Bad
alert('Order created successfully');
```

### 9.2 Confirmation Modals
- ✅ **Always confirm destructive actions** (delete, logout, etc.)
- ✅ Use `useConfirm` hook for confirmation dialogs
- ✅ Provide clear warning messages
- ✅ Make confirm button stand out (danger style)

```typescript
// ✅ Good
const confirmed = await confirm({
  title: 'Delete User?',
  message: 'This action cannot be undone.',
  confirmText: 'Delete',
  type: 'danger'
});
if (confirmed) { deleteUser(); }

// ❌ Bad
if (window.confirm('Delete user?')) { deleteUser(); }
```

### 9.3 Progress Bars
- ✅ Show progress for operations > 2 seconds
- ✅ Use real progress when available
- ✅ Use indeterminate progress when unknown
- ✅ Allow cancellation when possible

### 9.4 Image Upload
- ✅ Always optional (user can skip)
- ✅ Support drag & drop
- ✅ Validate file type and size
- ✅ Show preview after upload
- ✅ Allow removal

---

## 10. Code Review Checklist

### Before Submitting PR
- [ ] Code follows project structure and naming conventions
- [ ] All tests pass
- [ ] No console.log or debug code
- [ ] No browser alerts (use toast notifications)
- [ ] Destructive actions have confirmation modals
- [ ] Long operations show progress bars
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] TypeScript types defined (no `any`)
- [ ] Code is commented where necessary
- [ ] No hardcoded values (use constants/config)
- [ ] Security considerations addressed
- [ ] Performance optimized where needed
- [ ] Animations smooth and short (200-300ms)

---

## 10. Documentation Requirements

### 10.1 Code Comments
- **Functions**: JSDoc comments for public functions
- **Complex Logic**: Inline comments explaining why
- **API Endpoints**: Document request/response formats
- **Database Queries**: Comments for complex queries

### 10.2 README Files
Each major module should have a README with:
- Purpose of the module
- How to use it
- Examples
- Important notes

---

## 11. Development Tracking

### 11.1 Progress Tracking
- ✅ Use `DEVELOPMENT_TRACKER.md` to track progress
- ✅ Update checklist in `docs/12_COMPLETE_FEATURE_CHECKLIST.md`
- ✅ Check `docs/14_PAGE_NAVIGATION_MAP.md` for all pages
- ✅ Follow `docs/13_IMPLEMENTATION_PRIORITY_MAP.md` for order

### 11.2 Before Starting Any Feature
1. Check feature checklist
2. Review page navigation map
3. Verify all events are handled
4. Check API design document
5. Review UI/UX guidelines

### 11.3 Before Marking Feature Complete
- [ ] All related pages implemented
- [ ] All functions working
- [ ] All events handled
- [ ] Toast notifications added
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Tested manually

---

## Document Control

**Version**: 1.0  
**Last Updated**: November 2025  
**Review Frequency**: Before each major release

