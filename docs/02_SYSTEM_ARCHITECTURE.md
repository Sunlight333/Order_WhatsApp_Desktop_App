# System Architecture & Database Schema
## Order Management Desktop Application

### Version: 1.0

---

## 1. System Architecture Overview

### 1.1 Architecture Pattern
**Distributed Desktop Architecture - Peer-to-Peer Model**

**Note**: This application uses a distributed architecture where one desktop app runs as the server and others connect as clients. See [07_PEER_TO_PEER_ARCHITECTURE.md](./07_PEER_TO_PEER_ARCHITECTURE.md) for complete details.

```
┌─────────────────────────────────────────┐
│  Desktop App #1 (SERVER MODE)          │
│  ┌───────────────────────────────────┐  │
│  │  Electron + Express.js Server     │  │
│  │  ┌────────────┐  ┌─────────────┐ │  │
│  │  │ Express.js │  │   SQLite    │ │  │
│  │  │   API      │◄─┤  Database   │ │  │
│  │  └────────────┘  └─────────────┘ │  │
│  │       ▲                           │  │
│  │       │ HTTP (port 3000)          │  │
│  └───────┼───────────────────────────┘  │
│          │                               │
└──────────┼───────────────────────────────┘
           │
           │ Local Network
           │
┌──────────┼───────────────────────────────┐
│          │  Desktop App #2 (CLIENT)      │
│          │  ┌──────────────────────────┐ │
│          │  │  Electron + React UI     │ │
│          └─►│  API Client              │ │
│             └──────────────────────────┘ │
└──────────────────────────────────────────┘
           │
┌──────────┼───────────────────────────────┐
│          │  Desktop App #3 (CLIENT)      │
│          │  ┌──────────────────────────┐ │
│          └─►│  Electron + React UI     │ │
│             │  API Client              │ │
│             └──────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Key Features:**
- Server runs inside Electron app (no separate deployment)
- SQLite database (file-based, no database server needed)
- Clients connect via IP address configuration
- All on local network

### 1.2 Component Breakdown

#### Client Layer (Desktop Application)
- **Framework**: Electron + React.js
- **State Management**: Redux Toolkit or React Context API
- **UI Library**: Material-UI or Tailwind CSS + Headless UI
- **HTTP Client**: Axios
- **Real-time Updates**: Polling or WebSocket (future enhancement)

#### Server Layer (Backend API)
- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **Authentication**: JWT or Session-based
- **Validation**: Zod or Joi
- **Error Handling**: Centralized error middleware

#### Data Layer
- **Database**: SQLite (default, file-based) | MySQL | PostgreSQL (optional)
- **ORM**: Prisma
- **Migrations**: Prisma Migrate
- **Seeding**: Prisma Seed
- **Location**: 
  - SQLite: User data directory (e.g., `%APPDATA%\OrderApp\database.db`)
  - MySQL/PostgreSQL: Remote database server (configured in settings)

**Default: SQLite**
- No separate database server required
- Single file database (easy backup)
- Excellent performance for desktop apps
- Supports concurrent access with WAL mode
- Zero configuration - works out of the box

**Optional: MySQL / PostgreSQL**
- Better for high-volume scenarios
- Advanced features and scalability
- Requires separate database server
- Configurable via settings page

---

## 2. Database Schema Design

### 2.1 Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│    User     │         │    Order     │         │   Supplier   │
├─────────────┤         ├──────────────┤         ├──────────────┤
│ id (PK)     │         │ id (PK)      │         │ id (PK)      │
│ username    │◄───────┤│ customerName │         │ name         │
│ password    │   1    ││ customerPhone│         │ description  │
│ role        │    N   ││ status       │         │ createdAt    │
│ createdAt   │         ││ observations │         │ updatedAt    │
│ updatedAt   │         ││ createdById  │         └──────────────┘
│             │         ││ createdAt    │                │
└─────────────┘         ││ updatedAt    │                │
        │               └──────────────┘                │
        │                       │                        │
        │                       │                        │
        │              ┌────────▼────────┐               │
        │              │  OrderSupplier  │               │
        │              ├─────────────────┤               │
        └──────────────┤ orderId (FK)    │◄──────────────┘
                       │ supplierId (FK) │
                       │ createdAt       │
                       └────────┬────────┘
                                │
                                │
                       ┌────────▼────────┐
                       │ OrderProduct    │
                       ├─────────────────┤
                       │ id (PK)         │
                       │ orderId (FK)    │
                       │ supplierId (FK) │
                       │ productRef      │
                       │ quantity        │
                       │ price           │
                       │ createdAt       │
                       └─────────────────┘

┌─────────────┐         ┌──────────────┐
│   Product   │         │ AuditLog     │
├─────────────┤         ├──────────────┤
│ id (PK)     │         │ id (PK)      │
│ supplierId  │         │ orderId (FK) │
│ reference   │         │ userId (FK)  │
│ description │         │ action       │
│ defaultPrice│         │ fieldChanged │
│ createdAt   │         │ oldValue     │
│ updatedAt   │         │ newValue     │
└─────────────┘         │ timestamp    │
                        └──────────────┘
```

### 2.2 Detailed Schema Definitions

#### Users Table
```sql
Table: users
- id: UUID (Primary Key)
- username: VARCHAR(50) UNIQUE NOT NULL
- password: VARCHAR(255) NOT NULL (hashed)
- role: ENUM('SUPER_ADMIN', 'USER') DEFAULT 'USER'
- createdAt: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updatedAt: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### Suppliers Table
```sql
Table: suppliers
- id: UUID (Primary Key)
- name: VARCHAR(100) NOT NULL
- description: TEXT
- createdAt: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updatedAt: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### Products Table
```sql
Table: products
- id: UUID (Primary Key)
- supplierId: UUID (Foreign Key -> suppliers.id)
- reference: VARCHAR(100) NOT NULL
- description: TEXT
- defaultPrice: DECIMAL(10, 2)
- createdAt: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updatedAt: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- UNIQUE(supplierId, reference)
```

#### Orders Table
```sql
Table: orders
- id: UUID (Primary Key)
- customerName: VARCHAR(100)
- customerPhone: VARCHAR(20) NOT NULL
- status: ENUM('PENDING', 'RECEIVED', 'NOTIFIED_CALL', 'NOTIFIED_WHATSAPP') 
         DEFAULT 'PENDING'
- notificationMethod: ENUM('CALL', 'WHATSAPP') NULL
- observations: TEXT
- createdById: UUID (Foreign Key -> users.id)
- createdAt: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updatedAt: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- notifiedAt: TIMESTAMP NULL
```

#### OrderSuppliers Table (Many-to-Many)
```sql
Table: orderSuppliers
- id: UUID (Primary Key)
- orderId: UUID (Foreign Key -> orders.id)
- supplierId: UUID (Foreign Key -> suppliers.id)
- createdAt: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- UNIQUE(orderId, supplierId)
```

#### OrderProducts Table
```sql
Table: orderProducts
- id: UUID (Primary Key)
- orderId: UUID (Foreign Key -> orders.id)
- supplierId: UUID (Foreign Key -> suppliers.id)
- productRef: VARCHAR(100) NOT NULL
- quantity: VARCHAR(50) NOT NULL (text input allowed)
- price: VARCHAR(50) NOT NULL (text input allowed)
- createdAt: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updatedAt: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### AuditLog Table
```sql
Table: auditLogs
- id: UUID (Primary Key)
- orderId: UUID (Foreign Key -> orders.id)
- userId: UUID (Foreign Key -> users.id)
- action: VARCHAR(50) NOT NULL 
         (CREATE, UPDATE, STATUS_CHANGE, DELETE_ATTEMPT, etc.)
- fieldChanged: VARCHAR(100) NULL
- oldValue: TEXT NULL
- newValue: TEXT NULL
- timestamp: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- metadata: JSON NULL (for additional context)
```

#### Config Table (Optional)
```sql
Table: config
- id: UUID (Primary Key)
- key: VARCHAR(100) UNIQUE NOT NULL
- value: TEXT
- updatedAt: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

---

## 3. Prisma Schema Definition

### 3.1 Prisma Schema File Structure

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql" // or "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  SUPER_ADMIN
  USER
}

enum OrderStatus {
  PENDING
  RECEIVED
  NOTIFIED_CALL
  NOTIFIED_WHATSAPP
}

enum NotificationMethod {
  CALL
  WHATSAPP
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique @db.VarChar(50)
  password  String   @db.VarChar(255)
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  createdOrders Order[]
  auditLogs     AuditLog[]
  
  @@map("users")
}

model Supplier {
  id          String    @id @default(uuid())
  name        String    @db.VarChar(100)
  description String?   @db.Text
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  products      Product[]
  orderSuppliers OrderSupplier[]
  orderProducts  OrderProduct[]
  
  @@map("suppliers")
}

model Product {
  id           String   @id @default(uuid())
  supplierId   String
  reference    String   @db.VarChar(100)
  description  String?  @db.Text
  defaultPrice Decimal? @db.Decimal(10, 2)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  supplier Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  
  @@unique([supplierId, reference])
  @@map("products")
}

model Order {
  id                String             @id @default(uuid())
  customerName      String?            @db.VarChar(100)
  customerPhone     String             @db.VarChar(20)
  status            OrderStatus        @default(PENDING)
  notificationMethod NotificationMethod?
  observations      String?            @db.Text
  createdById       String
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  notifiedAt        DateTime?
  
  createdBy    User           @relation(fields: [createdById], references: [id])
  suppliers    OrderSupplier[]
  products     OrderProduct[]
  auditLogs    AuditLog[]
  
  @@index([customerPhone])
  @@index([status])
  @@index([createdAt])
  @@map("orders")
}

model OrderSupplier {
  id         String   @id @default(uuid())
  orderId    String
  supplierId String
  createdAt  DateTime @default(now())
  
  order    Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  supplier Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  
  @@unique([orderId, supplierId])
  @@map("orderSuppliers")
}

model OrderProduct {
  id         String   @id @default(uuid())
  orderId    String
  supplierId String
  productRef String   @db.VarChar(100)
  quantity   String   @db.VarChar(50)
  price      String   @db.VarChar(50)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  order    Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  supplier Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@map("orderProducts")
}

model AuditLog {
  id          String   @id @default(uuid())
  orderId     String
  userId      String
  action      String   @db.VarChar(50)
  fieldChanged String? @db.VarChar(100)
  oldValue    String?  @db.Text
  newValue    String?  @db.Text
  timestamp   DateTime @default(now())
  metadata    Json?
  
  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id])
  
  @@index([orderId])
  @@index([userId])
  @@index([timestamp])
  @@map("auditLogs")
}

model Config {
  id        String   @id @default(uuid())
  key       String   @unique @db.VarChar(100)
  value     String?  @db.Text
  updatedAt DateTime @updatedAt
  
  @@map("config")
}
```

---

## 4. API Architecture

### 4.1 API Endpoint Structure

```
Base URL: http://localhost:3000/api/v1

Authentication:
  POST   /api/v1/auth/login
  POST   /api/v1/auth/logout
  GET    /api/v1/auth/me

Users (Super Admin only):
  GET    /api/v1/users
  POST   /api/v1/users
  GET    /api/v1/users/:id
  PUT    /api/v1/users/:id
  DELETE /api/v1/users/:id

Suppliers (Super Admin):
  GET    /api/v1/suppliers
  POST   /api/v1/suppliers
  GET    /api/v1/suppliers/:id
  PUT    /api/v1/suppliers/:id
  DELETE /api/v1/suppliers/:id

Products (Super Admin):
  GET    /api/v1/products?supplierId=xxx
  POST   /api/v1/products
  GET    /api/v1/products/:id
  PUT    /api/v1/products/:id
  DELETE /api/v1/products/:id

Orders:
  GET    /api/v1/orders?search=xxx&status=xxx&dateFrom=xxx&dateTo=xxx
  POST   /api/v1/orders
  GET    /api/v1/orders/:id
  PUT    /api/v1/orders/:id
  GET    /api/v1/orders/:id/history

Config:
  GET    /api/v1/config/:key
  PUT    /api/v1/config/:key
```

### 4.2 API Response Format

Standard Success Response:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

Standard Error Response:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

---

## 5. Data Flow Diagrams

### 5.1 Order Creation Flow
```
User Input → Frontend Validation → API Request → 
Backend Validation → Database Transaction → 
Supplier Lookup (find or auto-create) → 
Product Lookup (find or auto-create per supplier) → 
Audit Log Creation → Response → Frontend Update
```

### 5.2 Status Update Flow
```
User Action → Status Change → API Update → 
Audit Log → Notification Trigger (if WhatsApp) → 
Response → UI Update (Color Change)
```

### 5.3 Search Flow
```
Search Input → Debounced API Request → 
Database Query (with indexes) → 
Filtered Results → Frontend Display
```

---

## 6. Security Architecture

### 6.1 Authentication Flow
1. User submits username/password
2. Server validates credentials
3. Server creates session/JWT token
4. Client stores token securely
5. Subsequent requests include token in header
6. Server validates token on each request

### 6.2 Authorization
- Role-based access control (RBAC)
- Middleware checks user role before route access
- Super Admin: Full access
- User: Limited to order operations

### 6.3 Data Protection
- Password hashing (bcrypt, cost factor 10+)
- SQL injection prevention (Prisma ORM)
- XSS prevention (input sanitization)
- CORS configuration
- Rate limiting on authentication endpoints

---

## 7. Deployment Architecture

### 7.1 Development
```
Local Development:
- Frontend: Electron app (localhost)
- Backend: Express.js (localhost:3000)
- Database: Local MySQL/PostgreSQL
```

### 7.2 Production
```
Production Deployment:
- Desktop Client: Electron packaged app
- Backend Server: Node.js process (PM2/systemd)
- Database: Dedicated MySQL/PostgreSQL server
- Network: LAN or VPN connection
```

---

## 8. Performance Considerations

### 8.1 Database Optimization
- Indexes on frequently queried fields:
  - orders.customerPhone
  - orders.status
  - orders.createdAt
  - auditLogs.orderId
  - auditLogs.timestamp
- Pagination for large result sets
- Efficient JOIN queries with Prisma

### 8.2 Caching Strategy
- Client-side caching of suppliers/products
- API response caching where appropriate
- Debounced search requests

### 8.3 Concurrent Access Handling
- Database transactions for consistency
- Optimistic locking for order updates
- Conflict resolution strategy

### 8.4 Supplier Auto-Creation Strategy
- Frontend sends `{ name, supplierId? }` for each supplier entry.
- Backend logic per supplier:
  1. If `supplierId` provided → use existing record.
  2. Else → normalize name (trim + lowercase) and search.
  3. If found → reuse existing supplier.
  4. If not found → create supplier inside same transaction as order.
- All supplier creations must be part of the order transaction to avoid partial orders.
- Newly created suppliers must immediately appear in suggestion lists (return via API).

---

## Document Control

**Version**: 1.0  
**Last Updated**: November 2025

