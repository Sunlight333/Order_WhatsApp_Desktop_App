# API Design Document
## Order Management Desktop Application

### Version: 1.0

---

## 1. API Overview

### 1.1 Base Information
- **Base URL**: `http://localhost:3000/api/v1`
- **Protocol**: HTTP/HTTPS
- **Data Format**: JSON
- **Authentication**: JWT Token or Session-based

### 1.2 Standard Headers
```
Content-Type: application/json
Authorization: Bearer <token> (or Cookie: sessionId=xxx)
Accept: application/json
```

---

## 2. Authentication Endpoints

### 2.1 Login
**POST** `/api/v1/auth/login`

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "securePassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "role": "USER"
    }
  },
  "message": "Login successful"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password"
  }
}
```

---

### 2.2 Logout
**POST** `/api/v1/auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 2.3 Get Current User
**GET** `/api/v1/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "role": "USER",
    "createdAt": "2025-11-20T10:00:00Z"
  }
}
```

---

## 3. User Management Endpoints (Super Admin Only)

### 3.1 List Users
**GET** `/api/v1/users`

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 50)
- `search`: string (optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "username": "john_doe",
        "role": "USER",
        "createdAt": "2025-11-20T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

---

### 3.2 Create User
**POST** `/api/v1/users`

**Request Body:**
```json
{
  "username": "new_user",
  "password": "securePassword123",
  "role": "USER"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "new_user",
    "role": "USER",
    "createdAt": "2025-11-20T10:00:00Z"
  },
  "message": "User created successfully"
}
```

---

### 3.3 Update User
**PUT** `/api/v1/users/:id`

**Request Body:**
```json
{
  "username": "updated_username",
  "role": "USER",
  "password": "newPassword" // optional
}
```

---

### 3.4 Delete User
**DELETE** `/api/v1/users/:id`

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 4. Supplier Management Endpoints (Super Admin)

### 4.1 List Suppliers
**GET** `/api/v1/suppliers`

**Query Parameters:**
- `page`: number
- `limit`: number
- `search`: string

**Response (200):**
```json
{
  "success": true,
  "data": {
    "suppliers": [
      {
        "id": "uuid",
        "name": "Supplier ABC",
        "description": "Auto parts supplier",
        "createdAt": "2025-11-20T10:00:00Z",
        "productCount": 150
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 4.2 Create Supplier
**POST** `/api/v1/suppliers`

**Request Body:**
```json
{
  "name": "Supplier ABC",
  "description": "Auto parts supplier"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Supplier ABC",
    "description": "Auto parts supplier",
    "createdAt": "2025-11-20T10:00:00Z"
  }
}
```

---

### 4.3 Update Supplier
**PUT** `/api/v1/suppliers/:id`

**Request Body:**
```json
{
  "name": "Updated Supplier Name",
  "description": "Updated description"
}
```

---

### 4.4 Delete Supplier
**DELETE** `/api/v1/suppliers/:id`

**Note**: Should check if supplier has associated products/orders before deletion.

---

## 5. Product Management Endpoints (Super Admin)

### 5.1 List Products
**GET** `/api/v1/products`

**Query Parameters:**
- `supplierId`: string (required)
- `page`: number
- `limit`: number
- `search`: string

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "supplierId": "uuid",
        "reference": "REF-12345",
        "description": "Brake pad set",
        "defaultPrice": "29.99",
        "createdAt": "2025-11-20T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 5.2 Create Product
**POST** `/api/v1/products`

**Request Body:**
```json
{
  "supplierId": "uuid",
  "reference": "REF-12345",
  "description": "Brake pad set",
  "defaultPrice": "29.99"
}
```

---

### 5.3 Update Product
**PUT** `/api/v1/products/:id`

**Request Body:**
```json
{
  "reference": "REF-12345-UPDATED",
  "description": "Updated description",
  "defaultPrice": "35.99"
}
```

---

### 5.4 Delete Product
**DELETE** `/api/v1/products/:id`

---

## 6. Order Management Endpoints

### 6.1 List Orders (with Search)
**GET** `/api/v1/orders`

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 50)
- `search`: string (searches customer name, phone, product ref, order ID)
- `status`: OrderStatus enum (PENDING, RECEIVED, NOTIFIED_CALL, NOTIFIED_WHATSAPP)
- `supplierId`: string
- `dateFrom`: ISO date string
- `dateTo`: ISO date string
- `createdBy`: user ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "customerName": "John Doe",
        "customerPhone": "+34123456789",
        "status": "PENDING",
        "notificationMethod": null,
        "observations": "Customer needs fast delivery",
        "createdBy": {
          "id": "uuid",
          "username": "john_doe"
        },
        "createdAt": "2025-11-20T10:00:00Z",
        "updatedAt": "2025-11-20T10:00:00Z",
        "notifiedAt": null,
        "suppliers": [
          {
            "id": "uuid",
            "name": "Supplier ABC"
          }
        ],
        "products": [
          {
            "id": "uuid",
            "supplierId": "uuid",
            "supplierName": "Supplier ABC",
            "productRef": "REF-12345",
            "quantity": "2",
            "price": "29.99"
          }
        ],
        "totalAmount": "59.98"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 250,
      "totalPages": 5
    }
  }
}
```

---

### 6.2 Get Single Order
**GET** `/api/v1/orders/:id`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customerName": "John Doe",
    "customerPhone": "+34123456789",
    "status": "PENDING",
    "notificationMethod": null,
    "observations": "Customer needs fast delivery",
    "createdBy": { ... },
    "createdAt": "2025-11-20T10:00:00Z",
    "updatedAt": "2025-11-20T10:00:00Z",
    "suppliers": [ ... ],
    "products": [ ... ],
    "totalAmount": "59.98"
  }
}
```

---

### 6.3 Create Order
**POST** `/api/v1/orders`

**Request Body:**
```json
{
  "customerName": "John Doe",
  "customerPhone": "+34123456789",
  "observations": "Customer needs fast delivery",
  "suppliers": [
    {
      "name": "Supplier ABC",        // Required free-text name typed by the user
      "supplierId": "uuid",          // Optional: provided when user selects existing supplier from hints
      "products": [
        {
          "productRef": "REF-12345",     // Required free-text reference typed by user
          "productId": "uuid",           // Optional: provided when user selects existing product from hints
          "quantity": "2",
          "price": "29.99"
        },
        {
          "productRef": "REF-67890",
          "productId": "uuid",
          "quantity": "1",
          "price": "15.50"
        },
        {
          "productRef": "NEW-PRODUCT-999",  // Example of new product typed by user
          "quantity": "5",
          "price": "12.00"
        }
      ]
    },
    {
      "name": "New Supplier Typed",  // Example of new supplier typed by user
      "products": [
        {
          "productRef": "REF-11111",
          "quantity": "3",
          "price": "10.00"
        }
      ]
    }
  ]
}
```

**Supplier Entry Behavior:**
- `name` is **required** and always comes from user input (free-text field with auto-complete hints).
- `supplierId` is **optional** and only sent when the user selects a suggestion that already exists in the database.
- If `supplierId` is omitted (new name), the backend must:
  1. Create the supplier record automatically.
  2. Use the newly created supplier for the order.
  3. Return the supplier in the response so future hints include it.

**Product Entry Behavior:**
- `productRef` is **required** and always comes from user input (free-text field with auto-complete hints).
- `productId` is **optional** and only sent when the user selects a suggestion that already exists in the database.
- Products are associated with suppliers (each supplier has its own product catalog).
- If `productId` is omitted (new product reference for that supplier), the backend must:
  1. Create the product record automatically for that supplier.
  2. Associate the product with the supplier.
  3. Use the newly created product for the order.
  4. Return the product in the response so future hints include it.

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customerName": "John Doe",
    "customerPhone": "+34123456789",
    "status": "PENDING",
    "createdAt": "2025-11-20T10:00:00Z",
    ...
  },
  "message": "Order created successfully"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "customerPhone": "Customer phone is required",
      "suppliers": "At least one supplier is required"
    }
  }
}
```

---

### 6.4 Update Order
**PUT** `/api/v1/orders/:id`

**Request Body:**
```json
{
  "customerName": "John Doe Updated",
  "customerPhone": "+34123456789",
  "status": "RECEIVED",
  "observations": "Updated observations",
  "suppliers": [
    // Updated supplier/product list
  ]
}
```

**Note**: All changes are logged in audit trail automatically.

---

### 6.5 Update Order Status
**PATCH** `/api/v1/orders/:id/status`

**Request Body:**
```json
{
  "status": "NOTIFIED_WHATSAPP",
  "notificationMethod": "WHATSAPP"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "NOTIFIED_WHATSAPP",
    "notificationMethod": "WHATSAPP",
    "notifiedAt": "2025-11-20T14:30:00Z"
  },
  "message": "Order status updated successfully"
}
```

---

### 6.6 Get Order History
**GET** `/api/v1/orders/:id/history`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "history": [
      {
        "id": "uuid",
        "action": "CREATE",
        "user": {
          "id": "uuid",
          "username": "john_doe"
        },
        "timestamp": "2025-11-20T10:00:00Z",
        "fieldChanged": null,
        "oldValue": null,
        "newValue": null
      },
      {
        "id": "uuid",
        "action": "UPDATE",
        "user": {
          "id": "uuid",
          "username": "jane_doe"
        },
        "timestamp": "2025-11-20T12:30:00Z",
        "fieldChanged": "status",
        "oldValue": "PENDING",
        "newValue": "RECEIVED"
      },
      {
        "id": "uuid",
        "action": "STATUS_CHANGE",
        "user": {
          "id": "uuid",
          "username": "jane_doe"
        },
        "timestamp": "2025-11-20T14:30:00Z",
        "fieldChanged": "status",
        "oldValue": "RECEIVED",
        "newValue": "NOTIFIED_WHATSAPP",
        "metadata": {
          "notificationMethod": "WHATSAPP"
        }
      }
    ]
  }
}
```

---

## 7. Configuration Endpoints

### 7.1 Get Configuration
**GET** `/api/v1/config/:key`

**Example:** `GET /api/v1/config/whatsapp_default_message`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "key": "whatsapp_default_message",
    "value": "Hola, tu pedido está listo para recoger."
  }
}
```

---

### 7.2 Update Configuration
**PUT** `/api/v1/config/:key`

**Request Body:**
```json
{
  "value": "Hola, tu pedido está listo para recoger. Gracias por confiar en nosotros."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "key": "whatsapp_default_message",
    "value": "Hola, tu pedido está listo para recoger. Gracias por confiar en nosotros.",
    "updatedAt": "2025-11-20T10:00:00Z"
  }
}
```

---

## 8. Error Codes

### 8.1 Authentication Errors
- `INVALID_CREDENTIALS`: Username or password incorrect
- `TOKEN_EXPIRED`: JWT token expired
- `TOKEN_INVALID`: Invalid token format
- `UNAUTHORIZED`: Not authenticated

### 8.2 Authorization Errors
- `FORBIDDEN`: Insufficient permissions
- `ROLE_REQUIRED`: Specific role required

### 8.3 Validation Errors
- `VALIDATION_ERROR`: Request validation failed
- `MISSING_REQUIRED_FIELD`: Required field missing
- `INVALID_FORMAT`: Invalid data format

### 8.4 Resource Errors
- `NOT_FOUND`: Resource not found
- `ALREADY_EXISTS`: Resource already exists (e.g., duplicate username)
- `CONFLICT`: Resource conflict (e.g., concurrent update)

### 8.5 Business Logic Errors
- `ORDER_NOT_DELETABLE`: Attempted to delete order (not allowed)
- `INVALID_STATUS_TRANSITION`: Invalid status change
- `SUPPLIER_HAS_PRODUCTS`: Cannot delete supplier with products

---

## 9. Rate Limiting

- **Authentication endpoints**: 5 requests per minute per IP
- **Search endpoints**: 30 requests per minute per user
- **Write operations**: 60 requests per minute per user
- **Read operations**: 120 requests per minute per user

---

## 10. WebSocket Events (Future Enhancement)

### 10.1 Real-time Updates
```
Connection: ws://localhost:3000/api/v1/ws

Events:
- order.created
- order.updated
- order.statusChanged
- user.online
- user.offline
```

---

## Document Control

**Version**: 1.0  
**Last Updated**: November 2025

