# Implementation Priority Map
## Development Order & Dependencies

### Version: 1.0

---

## 🎯 Development Phases (Priority Order)

### Phase 1: Foundation (Week 1) - MUST DO FIRST
**Goal**: Get basic app running and authenticated users can access

#### Priority 1.1: Core Infrastructure ✅
- [x] Project structure
- [x] Database schema
- [x] Theme system (CSS variables)
- [ ] Environment configuration
- [ ] Build scripts

#### Priority 1.2: Authentication System
- [ ] Login page
- [ ] Login API endpoint
- [ ] JWT/session management
- [ ] Protected routes middleware
- [ ] Logout functionality

#### Priority 1.3: Basic Layout
- [ ] Main layout component
- [ ] Header with user info
- [ ] Sidebar navigation
- [ ] Theme toggle in header
- [ ] Protected route wrapper

---

### Phase 2: Core Features (Week 2-3) - CRITICAL

#### Priority 2.1: Toast Notification System
- [ ] Toast component
- [ ] Toast container
- [ ] useToast hook
- [ ] Replace all alerts
- [ ] Success/Error/Warning/Info variants

#### Priority 2.2: Order Management - Core
- [ ] Order list page (LIST VIEW - critical!)
- [ ] Create order page/form
- [ ] Order detail/view page
- [ ] Order CRUD API endpoints
- [ ] Multi-supplier support
- [ ] Multi-product per supplier
- [ ] Text inputs for quantity/price (no arrows)

#### Priority 2.3: Search & Filter
- [ ] Search bar component
- [ ] Search API endpoint
- [ ] Filter panel
- [ ] Real-time search (debounced)
- [ ] Advanced filters

---

### Phase 3: Status & Notifications (Week 3-4) - IMPORTANT

#### Priority 3.1: Status Management
- [ ] Status update UI
- [ ] Status update API
- [ ] Color-coded status indicators
- [ ] Status change audit log

#### Priority 3.2: WhatsApp Integration
- [ ] Phone number click handler
- [ ] WhatsApp URL scheme
- [ ] Default message config
- [ ] Status auto-update on WhatsApp send
- [ ] Confirmation dialog

---

### Phase 4: Admin Features (Week 4-5) - REQUIRED

#### Priority 4.1: User Management (Super Admin)
- [ ] User list page
- [ ] Create user form
- [ ] Edit user form
- [ ] Delete user (with confirmation)
- [ ] User CRUD API endpoints

#### Priority 4.2: Supplier Management (Super Admin)
- [ ] Supplier list page
- [ ] Create supplier form
- [ ] Edit supplier form
- [ ] Delete supplier (with confirmation)
- [ ] Supplier CRUD API endpoints

#### Priority 4.3: Product Management (Super Admin)
- [ ] Product list page (by supplier)
- [ ] Create product form
- [ ] Edit product form
- [ ] Delete product (with confirmation)
- [ ] Product CRUD API endpoints

---

### Phase 5: Settings & Configuration (Week 5-6) - CRITICAL

#### Priority 5.1: Settings Page
- [ ] Application mode selection (Server/Client)
- [ ] Server configuration section
- [ ] Client configuration section
- [ ] Database configuration section
- [ ] Theme selection
- [ ] Save & restart functionality

#### Priority 5.2: Configuration Management
- [ ] Config file management
- [ ] Server manager (start/stop)
- [ ] IP detection
- [ ] Connection testing
- [ ] Database connection testing

---

### Phase 6: Advanced Features (Week 6-7) - ENHANCEMENT

#### Priority 6.1: Audit Trail
- [ ] Audit log service
- [ ] Order history page/view
- [ ] Timeline display
- [ ] Field-level change tracking

#### Priority 6.2: Progress Bars
- [ ] Progress bar component
- [ ] Use for bulk operations
- [ ] Use for exports
- [ ] Real progress tracking

#### Priority 6.3: Image Upload (Optional)
- [ ] Image upload component
- [ ] Drag & drop
- [ ] Preview functionality
- [ ] File validation

---

## 📋 Feature Dependency Map

```
Foundation Layer
├── Authentication
│   ├── Login Page
│   ├── Login API
│   └── Session Management
│
├── Layout
│   ├── Main Layout
│   ├── Header
│   ├── Sidebar
│   └── Protected Routes
│
└── Theme System
    ├── CSS Variables
    ├── Theme Hook
    └── Theme Toggle

UI Components Layer
├── Toast Notifications
│   ├── Toast Component
│   ├── Toast Container
│   └── useToast Hook
│
├── Confirmation Modals
│   └── Confirm Modal Component
│
├── Progress Bars
│   └── Progress Bar Component
│
└── Image Upload
    └── Image Upload Component

Core Features Layer
├── Order Management
│   ├── Order List (LIST VIEW - Critical!)
│   ├── Create Order Form
│   ├── Order Detail/Edit
│   ├── Order API
│   └── Audit Logging
│
├── Search & Filter
│   ├── Search Bar
│   ├── Filter Panel
│   └── Search API
│
└── Status Management
    ├── Status Update UI
    ├── Status API
    └── Color Indicators

Admin Features Layer (Super Admin Only)
├── User Management
│   ├── User List
│   ├── User CRUD
│   └── User API
│
├── Supplier Management
│   ├── Supplier List
│   ├── Supplier CRUD
│   └── Supplier API
│
└── Product Management
    ├── Product List
    ├── Product CRUD
    └── Product API

Settings & Configuration Layer
├── Settings Page
│   ├── App Mode Selection
│   ├── Server Config
│   ├── Client Config
│   ├── Database Config
│   └── Theme Selection
│
├── Server Manager
│   ├── Start/Stop Server
│   └── Port Management
│
└── Config Manager
    ├── Load Config
    ├── Save Config
    └── Connection Testing

WhatsApp Integration Layer
├── Phone Click Handler
├── WhatsApp URL Scheme
├── Default Message Config
└── Status Auto-Update
```

---

## ⚠️ Critical Requirements Checklist

### Must Have (Cannot Skip)
- [ ] **List View** for orders (NOT cards!)
- [ ] **Text inputs** for quantity/price (NO numeric arrows)
- [ ] **Multiple suppliers** per order
- [ ] **Multiple products** per supplier
- [ ] **Supplier input = free text with suggestions** (no locked dropdown)
- [ ] **New supplier names auto-create records during order save**
- [ ] **No order deletion** (prevented in code)
- [ ] **WhatsApp click** on phone number
- [ ] **Toast notifications** (NO browser alerts)
- [ ] **Confirmation modals** for destructive actions
- [ ] **Color-coded status** (Yellow/Green)
- [ ] **Complete audit trail** (all changes logged)

### Critical Events to Handle
- [ ] Order creation success/error
- [ ] Order update success/error
- [ ] Status change confirmation
- [ ] WhatsApp message sent
- [ ] User login/logout
- [ ] User create/delete (admin)
- [ ] Supplier create/delete (admin)
- [ ] Product create/delete (admin)
- [ ] Search results update
- [ ] Filter changes
- [ ] Settings save
- [ ] Server connection test
- [ ] Database connection test
- [ ] Theme change

---

## 🔄 Event Flow Diagrams

### Order Creation Flow
```
User clicks "Create Order"
  ↓
Open Create Order Form
  ↓
User fills form:
  - Customer info
  - Add suppliers (type names freely, suggestions optional)
  - Add products per supplier (type references freely, suggestions optional)
  ↓
User clicks "Save"
  ↓
Validate form (client-side)
  ↓
Show loading state
  ↓
API: POST /api/v1/orders
  ↓
For each supplier: find existing by name or auto-create new supplier
  ↓
For each product per supplier: find existing by reference or auto-create new product for supplier
  ↓
Create order in database
  ↓
Create audit log (CREATE action)
  ↓
Return success response
  ↓
Show success toast
  ↓
Refresh order list
  ↓
Navigate to new order (optional)
```

### Status Update Flow
```
User clicks on status
  ↓
Show status selection UI
  ↓
User selects new status
  ↓
If "NOTIFIED", show notification method selection
  ↓
User confirms change
  ↓
Show confirmation modal (for status changes)
  ↓
User confirms in modal
  ↓
API: PATCH /api/v1/orders/:id/status
  ↓
Update order status
  ↓
Update notifiedAt timestamp (if notified)
  ↓
Create audit log (STATUS_CHANGE action)
  ↓
Return success response
  ↓
Show success toast
  ↓
Update UI (change color indicator)
```

### WhatsApp Integration Flow
```
User clicks on phone number
  ↓
Fetch default message from config
  ↓
Build WhatsApp URL: wa.me/{phone}?text={message}
  ↓
Open WhatsApp Web/Desktop
  ↓
Show confirmation dialog:
  "Did you send the WhatsApp message?"
  ↓
If Yes:
  - Update order status to NOTIFIED_WHATSAPP
  - Set notificationMethod to WHATSAPP
  - Update notifiedAt timestamp
  - Create audit log
  - Show success toast
  - Update UI color to green
↓
If No:
  - Do nothing
  - Close dialog
```

### Delete User Flow (Super Admin)
```
Admin clicks "Delete User"
  ↓
Show confirmation modal:
  "Are you sure you want to delete user 'username'?
   This action cannot be undone."
  ↓
User clicks "Cancel":
  - Close modal
  - Do nothing
  ↓
User clicks "Delete User":
  - Close modal
  - Show loading state
  - API: DELETE /api/v1/users/:id
  - Check if user can be deleted
  - Delete user from database
  - Return success response
  - Show success toast
  - Remove user from list
  - Refresh user list
```

---

## 📝 Implementation Notes

### Critical Implementation Points

1. **Order List MUST be List View**
   - Use table/list format
   - NOT card view
   - Optimize for many orders

2. **Quantity/Price Inputs**
   - Use text input (type="text")
   - NOT number input (no arrows!)
   - Allow letters if needed

3. **No Order Deletion**
   - Remove delete buttons
   - Don't implement delete endpoint
   - Show error if attempted

4. **All Events Must Show Feedback**
   - Success → Toast notification
   - Error → Toast notification
   - Loading → Spinner/progress
   - Confirmation → Modal

5. **WhatsApp Integration**
   - Click phone number
   - Open WhatsApp with message
   - Confirm after sending
   - Auto-update status

---

## Document Control

**Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Active Development Reference

**Use this alongside the feature checklist to ensure nothing is missed!**

