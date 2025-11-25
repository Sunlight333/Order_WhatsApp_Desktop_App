# Project Requirements Document
## Order Management Desktop Application

### Version: 1.0
### Date: November 2025
### Status: Active Development

---

## 1. Executive Summary

A desktop-based order management system designed for efficient daily order tracking across multiple workstations. The system enables real-time collaboration, complete audit trails, and seamless WhatsApp integration for customer notifications.

---

## 2. Project Overview

### 2.1 Purpose
Develop a networked desktop application that allows multiple users to manage daily orders simultaneously, ensuring data consistency, user accountability, and streamlined customer communication.

### 2.2 Key Objectives
- Enable multi-user concurrent access from multiple computers
- Provide complete order lifecycle tracking with status management
- Ensure all modifications are tracked by user and timestamp
- Integrate WhatsApp for instant customer communication
- Offer powerful search capabilities for quick order retrieval
- Maintain data integrity (no order deletion)

---

## 3. Functional Requirements

### 3.1 User Management

#### 3.1.1 Authentication
- **FR-1.1**: Users must authenticate using username and password (NOT email)
- **FR-1.2**: Passwords must be securely hashed and stored
- **FR-1.3**: Session management for authenticated users
- **FR-1.4**: Support for concurrent sessions across multiple workstations

#### 3.1.2 User Roles
- **FR-1.5**: Super Admin Role
  - Register new users (username-based)
  - Delete users
  - Manage suppliers
  - Manage products/items associated with suppliers
  - Full system access
- **FR-1.6**: Regular User Role
  - Create and manage orders
  - Update order statuses
  - Search orders
  - View order history

### 3.2 Order Management

#### 3.2.1 Order Creation
- **FR-2.1**: Create orders with the following mandatory fields:
  - Customer phone number (required)
  - Customer name (optional)
  - Multiple suppliers per order
  - Supplier entry must be a **free-text field with type-ahead suggestions** (not a locked dropdown)
  - Multiple product references per supplier
  - Quantity per product (text input allowed, no numeric arrows)
  - Price per product (text input allowed, no numeric arrows)
  - Observations/notes field
  - Creator user (auto-assigned)
  - Creation timestamp (auto-assigned)
- **FR-2.1a**: Supplier Input Behavior:
  - Supplier entry must be a **free-text field with type-ahead suggestions** (not a locked dropdown)
  - Users can type any supplier name freely
  - Suggestions come from existing suppliers in database (hints only)
  - When registering an order, if the user types a supplier name that does not yet exist in the database, the system must automatically create that supplier record (and associate it to the order) without forcing the user to leave the flow

- **FR-2.1b**: Product Reference Input Behavior:
  - Product reference entry must be a **free-text field with type-ahead suggestions** (not a locked dropdown)
  - Users can type any product reference freely
  - Suggestions come from existing products for the selected supplier (hints only)
  - Products are associated with suppliers (each supplier can have its own products)
  - When registering an order, if the user types a product reference that does not yet exist for that supplier, the system must automatically create that product record (and associate it to the supplier) without forcing the user to leave the flow

#### 3.2.2 Order Structure
- **FR-2.2**: Each order must support:
  - One customer (phone + optional name)
  - Multiple suppliers (N suppliers)
    - Supplier names suggested from database but **users can always type new names**
  - Multiple products per supplier (N products per supplier)
  - Each product line: reference, quantity, price

#### 3.2.3 Order Display
- **FR-2.3**: Orders must be displayed in **LIST VIEW** format (not card view)
- **FR-2.4**: List view optimized for high-volume daily order processing
- **FR-2.5**: Display key information at a glance:
  - Order ID
  - Customer name/phone
  - Status (color-coded)
  - Number of suppliers
  - Total amount (calculated)
  - Creation date/time
  - Last modified date/time

#### 3.2.4 Order Modification
- **FR-2.6**: Orders can be updated but **NEVER deleted**
- **FR-2.7**: All modifications must record:
  - User who made the change
  - Exact timestamp of change
  - Field modified (audit trail)
  - Previous value and new value

#### 3.2.5 Order Status Management
- **FR-2.8**: Implement visual status system:
  - **Yellow Status**: Order received (merchandise received)
  - **Green Status**: Customer notified
    - Specify notification method: "Call" or "WhatsApp"
    - Record notification timestamp
- **FR-2.9**: Status transitions must be logged in audit trail

### 3.3 Supplier Management

#### 3.3.1 Supplier Operations (Super Admin Only)
- **FR-3.1**: Create suppliers with name and details
- **FR-3.2**: Edit supplier information
- **FR-3.3**: Associate products/items with suppliers
- **FR-3.4**: Manage product catalog per supplier:
  - Product reference/code
  - Product description
  - Optional: default price (can be overridden in orders)

### 3.4 WhatsApp Integration

#### 3.4.1 WhatsApp Link Functionality
- **FR-4.1**: Click on customer phone number to open WhatsApp
- **FR-4.2**: Pre-populate WhatsApp message with predefined default text
- **FR-4.3**: Support WhatsApp Web/Desktop application opening
- **FR-4.4**: Auto-update order status to "Green - Customer Notified (WhatsApp)" when message is sent
  - Note: This requires monitoring WhatsApp state (may need user confirmation)

#### 3.4.2 WhatsApp Configuration
- **FR-4.5**: Admin configurable default message template
- **FR-4.6**: Support for phone number format validation and normalization

### 3.5 Search Functionality

#### 3.5.1 Search Capabilities
- **FR-5.1**: Powerful search engine supporting:
  - Search by customer name
  - Search by phone number (partial or full)
  - Search by supplier name
  - Search by product reference
  - Search by order ID
  - Search by date range
  - Search by status
  - Full-text search across observations
- **FR-5.2**: Real-time search results (instant feedback)
- **FR-5.3**: Advanced filters:
  - Date range picker
  - Status filter
  - Supplier filter
  - User filter (who created/modified)

### 3.6 Data Integrity & Audit Trail

#### 3.6.1 Data Protection
- **FR-6.1**: Orders are immutable in deletion (soft delete if needed, but prefer no deletion)
- **FR-6.2**: Complete audit log of all operations:
  - Order creation
  - Order modifications
  - Status changes
  - User who performed action
  - Exact timestamp (date + time with seconds)

#### 3.6.2 History Tracking
- **FR-6.3**: View complete order history showing all changes
- **FR-6.4**: Display modification timeline with user attribution

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-1**: Application must handle high-volume daily orders (hundreds per day)
- **NFR-2**: Search results must appear within 200ms
- **NFR-3**: Multi-user concurrent access without performance degradation
- **NFR-4**: Optimized database queries with proper indexing

### 4.2 Usability
- **NFR-5**: Intuitive, easy-to-learn interface
- **NFR-6**: Visually attractive and modern design
- **NFR-7**: List view optimized for rapid order entry and review
- **NFR-8**: Keyboard shortcuts for common actions
- **NFR-9**: Clear visual feedback for all user actions

### 4.3 Reliability
- **NFR-10**: 99.9% uptime for server component
- **NFR-11**: Data consistency across all clients
- **NFR-12**: Automatic conflict resolution for concurrent edits

### 4.4 Security
- **NFR-13**: Secure password storage (bcrypt/argon2)
- **NFR-14**: Session-based authentication
- **NFR-15**: SQL injection prevention (Prisma ORM)
- **NFR-16**: XSS prevention in frontend
- **NFR-17**: Role-based access control (RBAC)

### 4.5 Scalability
- **NFR-18**: Support for at least 10 concurrent users
- **NFR-19**: Database designed for growth (millions of orders)
- **NFR-20**: Efficient data pagination for large result sets

### 4.6 Compatibility
- **NFR-21**: Desktop application using Electron (or similar)
- **NFR-22**: Windows 10+ compatibility
- **NFR-23**: Network connectivity required for server communication

---

## 5. Technical Constraints

### 5.1 Technology Stack
- **Backend**: Express.js (Node.js)
- **Frontend**: React.js
- **ORM**: Prisma
- **Database**: MySQL or PostgreSQL
- **Desktop Framework**: Electron (recommended)

### 5.2 Architecture
- **Architecture Pattern**: Client-Server (RESTful API)
- **Data Synchronization**: Real-time updates via API polling or WebSocket
- **State Management**: Redux or React Context API

### 5.3 Database Requirements
- Relational database (MySQL/PostgreSQL)
- Support for transactions
- Foreign key constraints for data integrity
- Proper indexing for performance

---

## 6. User Interface Requirements

### 6.1 Layout
- **UI-1**: Modern, clean interface design
- **UI-2**: Responsive to different screen sizes
- **UI-3**: List-based view for orders (primary view)
- **UI-4**: Sidebar or top navigation for main sections
- **UI-5**: Color-coded status indicators (Yellow, Green)

### 6.2 Theme Support
- **UI-6**: Light theme (default)
- **UI-7**: Dark theme for low-light environments
- **UI-8**: System theme option (follows OS preference)
- **UI-9**: Theme toggle in header for quick switching
- **UI-10**: Theme preference persisted across sessions
- **UI-11**: Smooth transitions between themes
- **UI-12**: All UI components support both themes

### 6.3 User Feedback & Notifications
- **UI-13**: All event results displayed via modern toast notifications (no browser alerts)
- **UI-14**: Toast notifications with seaside theme styling
- **UI-15**: Smooth animations for all interactions (200-300ms)
- **UI-16**: Confirmation modals for all destructive/restrictive actions
- **UI-17**: Real progress bars for long-running operations
- **UI-18**: Image drag & drop upload (optional, modern design)

### 6.4 Animation & Interactions
- **UI-19**: Smooth, short animations (150-300ms)
- **UI-20**: Modern easing functions (cubic-bezier)
- **UI-21**: All interactive elements have hover/focus states
- **UI-22**: Loading states for async operations

### 6.2 Forms
- **UI-6**: User-friendly form layouts
- **UI-7**: Input validation with clear error messages
- **UI-8**: Quantity and price inputs allow text input (no numeric spinners)
- **UI-9**: Auto-save functionality where applicable

### 6.3 Navigation
- **UI-10**: Clear navigation structure
- **UI-11**: Breadcrumbs or clear page hierarchy
- **UI-12**: Quick access to frequently used features

---

## 7. Integration Requirements

### 7.1 WhatsApp Integration
- **INT-1**: Integration with WhatsApp Web/Desktop
- **INT-2**: URL scheme handler for WhatsApp protocol
- **INT-3**: Message template configuration

### 7.2 System Integration
- **INT-4**: System tray integration (optional)
- **INT-5**: Notification system for order updates (optional)

---

## 8. Out of Scope (Future Enhancements)

- Mobile application
- Email notifications
- Advanced reporting and analytics dashboard
- PDF export functionality
- Barcode scanning
- Inventory management
- Financial accounting integration
- Multi-language support

---

## 9. Success Criteria

1. ✅ Multi-user concurrent access working seamlessly
2. ✅ Complete audit trail for all operations
3. ✅ WhatsApp integration functional with one-click access
4. ✅ Search functionality returning results in < 200ms
5. ✅ List view displaying hundreds of orders efficiently
6. ✅ No order deletion capability (data integrity)
7. ✅ Intuitive UI with positive user feedback
8. ✅ Zero data loss during concurrent operations

---

## 10. Assumptions

1. Network connectivity is stable and available
2. Server is accessible from all client machines
3. WhatsApp Web/Desktop is installed on client machines
4. Users have basic computer literacy
5. Super admin will manage initial supplier and product setup

---

## 11. Dependencies

1. WhatsApp Web/Desktop application installed on client machines
2. Network infrastructure for client-server communication
3. Database server setup and configuration
4. Node.js runtime environment

---

## 12. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| WhatsApp API changes | High | Medium | Use stable URL scheme approach |
| Concurrent edit conflicts | Medium | High | Implement optimistic locking |
| Network connectivity issues | High | Medium | Offline mode detection, retry logic |
| Performance with large datasets | Medium | Medium | Implement pagination and indexing |
| User adoption | Medium | Low | User training, intuitive UI |

---

## Document Control

**Author**: Development Team  
**Reviewer**: Client  
**Approval**: Pending  
**Version History**: 
- v1.0 - Initial requirements document

