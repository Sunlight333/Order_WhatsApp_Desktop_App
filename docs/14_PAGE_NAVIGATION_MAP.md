# Page Navigation Map & User Flows
## Complete Visual Guide to All Pages and Navigation

### Version: 1.0

---

## 🗺️ Application Navigation Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION ENTRY                         │
│                                                             │
│  ┌──────────────────┐                                       │
│  │   LOGIN PAGE     │  ← Not authenticated                 │
│  └────────┬─────────┘                                       │
│           │                                                  │
│           ↓ (Authenticate)                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              MAIN APPLICATION LAYOUT                 │   │
│  │  ┌──────────┐  ┌────────────────────────────────┐  │   │
│  │  │ SIDEBAR  │  │     MAIN CONTENT AREA           │  │   │
│  │  │          │  │                                 │  │   │
│  │  │ Home     │  │  ┌──────────────────────────┐  │  │   │
│  │  │ Orders   │  │  │   ORDER LIST PAGE         │  │  │   │
│  │  │ Suppliers│  │  │   (List View)             │  │  │   │
│  │  │ Products │  │  │                          │  │  │   │
│  │  │ Users    │  │  │   [Search] [Filters]     │  │  │   │
│  │  │ Settings │  │  │   [Create Order]         │  │  │   │
│  │  │          │  │  │                          │  │  │   │
│  │  │          │  │  │   ┌────────────────────┐ │  │  │   │
│  │  │          │  │  │   │ Order Row 1        │ │  │  │   │
│  │  │          │  │  │   │ Order Row 2        │ │  │  │   │
│  │  │          │  │  │   │ ...                │ │  │  │   │
│  │  │          │  │  │   └────────────────────┘ │  │  │   │
│  │  │          │  │  │                          │  │  │   │
│  │  │          │  │  │   [Pagination]          │  │  │   │
│  │  │          │  │  └──────────────────────────┘  │  │   │
│  │  │          │  │                                 │  │   │
│  │  │          │  │  Click Order → ORDER DETAIL    │  │   │
│  │  │          │  │  Click Create → CREATE ORDER   │  │   │
│  │  └──────────┘  └────────────────────────────────┘  │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📄 Complete Page List

### 1. Authentication Pages

#### Login Page (`/login`)
**Route**: `/login`  
**Access**: Public (not authenticated)  
**Layout**: Full screen, centered

**Components:**
- [ ] Logo/App name
- [ ] Username input
- [ ] Password input
- [ ] Login button
- [ ] Error message area
- [ ] Loading state

**Events:**
- [ ] Form submit → Login API call
- [ ] Success → Navigate to `/orders`
- [ ] Error → Show error toast

**Links/Navigation:**
- None (user must login)

---

### 2. Main Application Pages (Authenticated)

#### Dashboard/Home Page (`/`)
**Route**: `/`  
**Access**: Authenticated  
**Redirects to**: `/orders`

**Note**: Can show statistics or redirect directly to orders list

---

#### Order List Page (`/orders`)
**Route**: `/orders`  
**Access**: Authenticated (All users)  
**Layout**: Main layout with sidebar

**Components:**
- [ ] Header: "Orders" title
- [ ] Search bar
- [ ] Filter panel (collapsible)
- [ ] Create Order button
- [ ] Order list (LIST VIEW - critical!)
- [ ] Pagination controls
- [ ] Loading skeleton/spinner
- [ ] Empty state

**Order List Row Components:**
- [ ] Status indicator (color-coded badge)
- [ ] Order ID
- [ ] Customer name (or phone if no name)
- [ ] Customer phone (clickable → WhatsApp)
- [ ] Suppliers count
- [ ] Total amount
- [ ] Created date/time
- [ ] Last modified date/time
- [ ] Actions menu (View, Edit)

**Events:**
- [ ] Page load → Fetch orders
- [ ] Search input → Debounced search
- [ ] Filter change → Update results
- [ ] Row click → Navigate to order detail
- [ ] Phone click → Open WhatsApp
- [ ] Create button click → Open create form
- [ ] Pagination → Load more orders

**Links/Navigation:**
- Click row → `/orders/:id`
- Click Create → `/orders/create`
- Sidebar → Other pages

---

#### Create Order Page (`/orders/create`)
**Route**: `/orders/create`  
**Access**: Authenticated (All users)  
**Layout**: Main layout with sidebar

**Components:**
- [ ] Header: "Create New Order"
- [ ] Customer Information section
  - [ ] Customer name input (optional)
  - [ ] Customer phone input (required)
  - [ ] Observations textarea
- [ ] Suppliers & Products section
  - [ ] Add Supplier button
  - [ ] **Supplier input = free-text chip component with auto-complete hints**
    - [ ] Suggestions dropdown (optional)
    - [ ] Always allow typing new names
  - [ ] Products section (for each supplier)
    - [ ] Add Product button
    - [ ] **Product reference autocomplete input (free-text with hints)**
    - [ ] Suggestions from existing products for the supplier
    - [ ] Allow typing new product references
    - [ ] Quantity input (text, no arrows)
    - [ ] Price input (text, no arrows)
    - [ ] Remove product button
  - [ ] Remove supplier button
- [ ] Action buttons
  - [ ] Cancel button
  - [ ] Create Order button

**Events:**
- [ ] Add Supplier → Show new supplier section
- [ ] Remove Supplier → Remove supplier section
- [ ] Add Product → Show new product row
- [ ] Remove Product → Remove product row
- [ ] Form validation → Check all required fields
- [ ] Submit form → Create order API
- [ ] Success → Show toast, navigate to `/orders/:id` or `/orders`
- [ ] Error → Show error toast

**Links/Navigation:**
- Cancel → `/orders`
- Success → `/orders/:id` or `/orders`

---

#### Order Detail Page (`/orders/:id`)
**Route**: `/orders/:id`  
**Access**: Authenticated (All users)  
**Layout**: Main layout with sidebar

**Components:**
- [ ] Header: Order ID / Customer name
- [ ] Back button
- [ ] Edit button
- [ ] Order Information section
  - [ ] Customer name
  - [ ] Customer phone (clickable → WhatsApp)
  - [ ] Status badge
  - [ ] Observations
  - [ ] Created by & date
  - [ ] Last modified date
- [ ] Suppliers & Products section
  - [ ] List all suppliers
  - [ ] List all products per supplier
  - [ ] Total amount
- [ ] Actions section
  - [ ] Update Status button
- [ ] History/Audit Trail section
  - [ ] Timeline of changes
  - [ ] User, action, timestamp

**Events:**
- [ ] Page load → Fetch order details
- [ ] Click Edit → Enter edit mode
- [ ] Click phone → Open WhatsApp
- [ ] Click Update Status → Show status modal
- [ ] Status change → Update order, show toast

**Links/Navigation:**
- Back → `/orders`
- Edit mode → Same page (inline edit)
- Sidebar → Other pages

---

#### Edit Order Page/Modal (`/orders/:id/edit`)
**Route**: `/orders/:id/edit` OR modal on detail page  
**Access**: Authenticated (All users)

**Components:**
- [ ] Same as Create Order form
- [ ] Pre-filled with current order data
- [ ] Save Changes button
- [ ] Cancel button

**Events:**
- [ ] Page load → Fetch order data
- [ ] Form changes → Track modifications
- [ ] Submit → Update order API
- [ ] Success → Show toast, update audit log, navigate back
- [ ] Error → Show error toast

**Links/Navigation:**
- Cancel → `/orders/:id`
- Success → `/orders/:id`

---

### 3. Admin Pages (Super Admin Only)

#### User List Page (`/users`)
**Route**: `/users`  
**Access**: Super Admin only  
**Layout**: Main layout with sidebar

**Components:**
- [ ] Header: "Users" + Create User button
- [ ] User table/list
  - [ ] Username
  - [ ] Role
  - [ ] Created date
  - [ ] Actions (Edit, Delete)
- [ ] Search bar
- [ ] Pagination

**Events:**
- [ ] Page load → Fetch users
- [ ] Click Create → Open create modal
- [ ] Click Edit → Open edit modal
- [ ] Click Delete → Show confirmation, delete
- [ ] Search → Filter users

**Links/Navigation:**
- Create User → Modal or `/users/create`
- Edit User → Modal or `/users/:id/edit`
- Sidebar → Other pages

---

#### Supplier List Page (`/suppliers`)
**Route**: `/suppliers`  
**Access**: Super Admin only  
**Layout**: Main layout with sidebar

**Components:**
- [ ] Header: "Suppliers" + Create Supplier button
- [ ] Supplier list
  - [ ] Supplier name
  - [ ] Description
  - [ ] Product count
  - [ ] Actions (Edit, Delete, View Products)
- [ ] Search bar
- [ ] Pagination

**Events:**
- [ ] Page load → Fetch suppliers
- [ ] Click Create → Open create modal
- [ ] Click Edit → Open edit modal
- [ ] Click Delete → Show confirmation, delete
- [ ] Click View Products → Navigate to products for supplier
- [ ] Search → Filter suppliers

**Links/Navigation:**
- View Products → `/products?supplierId=xxx`
- Sidebar → Other pages

---

#### Product List Page (`/products`)
**Route**: `/products?supplierId=xxx`  
**Access**: Super Admin only  
**Layout**: Main layout with sidebar

**Components:**
- [ ] Header: "Products" + Supplier filter + Create Product button
- [ ] Supplier dropdown (required selection)
- [ ] Product list
  - [ ] Product reference
  - [ ] Description
  - [ ] Default price
  - [ ] Actions (Edit, Delete)
- [ ] Search bar
- [ ] Pagination

**Events:**
- [ ] Supplier selection → Fetch products for supplier
- [ ] Click Create → Open create modal
- [ ] Click Edit → Open edit modal
- [ ] Click Delete → Show confirmation, delete
- [ ] Search → Filter products

**Links/Navigation:**
- Sidebar → Other pages

---

### 4. Settings Page (`/settings`)
**Route**: `/settings`  
**Access**: Authenticated (All users)  
**Layout**: Main layout with sidebar

**Components:**
- [ ] Header: "Settings"
- [ ] Application Mode section
  - [ ] Server Mode / Client Mode radio buttons
- [ ] Server Configuration (Server Mode)
  - [ ] Local IP display
  - [ ] Port input
  - [ ] Share info display
- [ ] Client Configuration (Client Mode)
  - [ ] Server IP input
  - [ ] Server port input
  - [ ] Test connection button
  - [ ] Connection status
- [ ] Database Configuration (Server Mode)
  - [ ] Database type dropdown
  - [ ] SQLite config or MySQL/PostgreSQL config
  - [ ] Test connection button
- [ ] Appearance section
  - [ ] Theme selection
- [ ] Save & Restart button

**Events:**
- [ ] Mode change → Show/hide relevant sections
- [ ] Test connection → Check server connection
- [ ] Test database → Check database connection
- [ ] Theme change → Update theme immediately
- [ ] Save → Save config, show restart prompt

**Links/Navigation:**
- Sidebar → Other pages

---

## 🔄 Complete User Flow Examples

### Flow 1: Create New Order
```
Login → Order List → Click "Create Order" → Fill Form → Submit → 
Success Toast → Order Detail Page
```

### Flow 2: Update Order Status
```
Order List → Click Order → Order Detail → Click "Update Status" → 
Select Status → Confirm Modal → Update API → Success Toast → 
Status Color Changes
```

### Flow 3: Notify Customer via WhatsApp
```
Order List/Detail → Click Phone Number → WhatsApp Opens → 
Confirm Dialog → Update Status → Success Toast → Status Green
```

### Flow 4: Search Orders
```
Order List → Type in Search → Debounced Search API → 
Results Update → Click Result → Order Detail
```

### Flow 5: Delete User (Super Admin)
```
Users List → Click Delete → Confirmation Modal → Confirm → 
Delete API → Success Toast → User Removed from List
```

---

## 📊 Page Access Matrix

| Page | Public | Regular User | Super Admin |
|------|--------|--------------|-------------|
| Login | ✅ | ✅ | ✅ |
| Orders List | ❌ | ✅ | ✅ |
| Create Order | ❌ | ✅ | ✅ |
| Order Detail | ❌ | ✅ | ✅ |
| Edit Order | ❌ | ✅ | ✅ |
| Users List | ❌ | ❌ | ✅ |
| Suppliers List | ❌ | ❌ | ✅ |
| Products List | ❌ | ❌ | ✅ |
| Settings | ❌ | ✅ | ✅ |

---

## 🎯 Page Implementation Checklist

### Must Implement
- [ ] Login Page
- [ ] Order List Page (CRITICAL - List View!)
- [ ] Create Order Page
- [ ] Order Detail Page
- [ ] Edit Order Page
- [ ] Settings Page

### Admin Only (Super Admin)
- [ ] User List Page
- [ ] Create/Edit User Modal/Page
- [ ] Supplier List Page
- [ ] Create/Edit Supplier Modal/Page
- [ ] Product List Page
- [ ] Create/Edit Product Modal/Page

---

## 🔗 Navigation Requirements

### Sidebar Navigation Items
- [ ] Home/Dashboard (→ `/orders`)
- [ ] Orders (→ `/orders`)
- [ ] Suppliers (→ `/suppliers`) - Admin only
- [ ] Products (→ `/products`) - Admin only
- [ ] Users (→ `/users`) - Admin only
- [ ] Settings (→ `/settings`)

### Header Actions
- [ ] Theme toggle
- [ ] User menu dropdown
  - [ ] User name
  - [ ] Logout option

---

## Document Control

**Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Active Development Reference

**Use this to track all pages and ensure none are missed!**

