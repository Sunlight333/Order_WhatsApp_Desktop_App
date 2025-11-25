# UI/UX Design Guidelines
## Order Management Desktop Application

### Version: 1.0

---

## 1. Design Philosophy

### 1.1 Core Principles
- **Clarity First**: Information should be immediately understandable
- **Efficiency**: Optimize for rapid order entry and review
- **Consistency**: Uniform patterns throughout the application
- **Feedback**: Clear visual feedback for all user actions
- **Accessibility**: Usable by all team members regardless of technical skill

### 1.2 Design Goals
- Modern, professional appearance
- Intuitive navigation without extensive training
- Fast workflow for high-volume daily operations
- Visual clarity for quick status identification
- Reduced cognitive load through smart defaults

---

## 2. Visual Design System

### 2.1 Theme System

The application supports **Light** and **Dark** themes with smooth transitions and persistent user preference.

#### Theme Implementation
- **CSS Variables**: All colors defined as CSS custom properties
- **System Preference**: Option to follow OS theme automatically
- **User Preference**: Manual theme selection with persistence
- **Smooth Transitions**: 200ms transition for theme changes

#### Theme Selection Options
1. **Light Theme**: Default, bright interface
2. **Dark Theme**: Dark interface for low-light environments
3. **System Default**: Automatically follows OS theme preference

---

### 2.2 Color Palette - Light Theme (Default)

#### Primary Colors - Charming Seaside Theme
```css
/* Light Theme - Charming Seaside */
:root[data-theme="light"] {
  /* Primary Brand Color - Ocean Teal */
  --primary: #0891b2; /* Cyan/Teal - Ocean blue */
  --primary-hover: #06b6d4;
  --primary-light: #cffafe; /* Light cyan */
  --primary-dark: #0e7490;

  /* Secondary Color - Sky Blue */
  --secondary: #38bdf8; /* Sky blue - lighter ocean tone */
  --secondary-hover: #0ea5e9;

  /* Accent Colors - Seaside Theme */
  --accent-coral: #f97316; /* Coral - for highlights */
  --accent-seafoam: #2dd4bf; /* Seafoam green */
  --accent-sand: #fef3c7; /* Sand beige */

  /* Status Colors */
  --status-pending: #f59e0b; /* Amber - Pending orders */
  --status-received: #fbbf24; /* Yellow - Merchandise received */
  --status-notified-call: #10b981; /* Green - Customer called */
  --status-notified-whatsapp: #059669; /* Dark Green - WhatsApp sent */

  /* Background Colors - Seaside Inspired */
  --bg-primary: #ffffff; /* Pure white - clean beach */
  --bg-secondary: #f0f9ff; /* Sky blue tint */
  --bg-tertiary: #e0f2fe; /* Light cyan - ocean spray */
  --bg-hover: #bae6fd; /* Light sky blue */
  --bg-active: #7dd3fc; /* Soft cyan */
  --bg-overlay: rgba(8, 145, 178, 0.5); /* Ocean teal overlay */

  /* Text Colors */
  --text-primary: #0c4a6e; /* Deep ocean blue */
  --text-secondary: #075985; /* Darker ocean */
  --text-tertiary: #0891b2; /* Ocean teal */
  --text-disabled: #67e8f9; /* Light cyan */
  --text-inverse: #ffffff;

  /* Border Colors */
  --border-primary: #cffafe; /* Very light cyan */
  --border-secondary: #a5f3fc; /* Light cyan */
  --border-focus: #0891b2; /* Ocean teal */

  /* Neutral Colors */
  --neutral-50: #f8fafc;
  --neutral-100: #f1f5f9;
  --neutral-200: #e2e8f0;
  --neutral-300: #cbd5e1;
  --neutral-400: #94a3b8;
  --neutral-500: #64748b;
  --neutral-600: #475569;
  --neutral-700: #334155;
  --neutral-800: #1e293b;
  --neutral-900: #0f172a;

  /* Semantic Colors - Seaside Theme */
  --success: #10b981; /* Green */
  --success-light: #d1fae5;
  --warning: #f59e0b; /* Amber */
  --warning-light: #fef3c7;
  --error: #ef4444; /* Red */
  --error-light: #fee2e2;
  --info: #0891b2; /* Ocean teal */
  --info-light: #cffafe;

  /* Shadow */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
```

---

### 2.3 Color Palette - Dark Theme

#### Primary Colors
```css
/* Dark Theme - Seaside Night */
:root[data-theme="dark"] {
  /* Primary Brand Color - Bright Ocean Teal */
  --primary: #06b6d4; /* Bright cyan */
  --primary-hover: #22d3ee;
  --primary-light: #0e7490;
  --primary-dark: #155e75;

  /* Secondary Color - Sky Blue */
  --secondary: #38bdf8; /* Sky blue */
  --secondary-hover: #7dd3fc;

  /* Accent Colors - Seaside Theme */
  --accent-coral: #fb923c; /* Brighter coral */
  --accent-seafoam: #5eead4; /* Bright seafoam */
  --accent-sand: #fcd34d; /* Golden sand */

  /* Status Colors (Adjusted for dark theme) */
  --status-pending: #fbbf24; /* Brighter amber */
  --status-received: #fcd34d; /* Brighter yellow */
  --status-notified-call: #34d399; /* Brighter green */
  --status-notified-whatsapp: #10b981; /* Green */

  /* Background Colors - Deep Ocean Night */
  --bg-primary: #0c4a6e; /* Deep ocean blue */
  --bg-secondary: #075985; /* Darker ocean */
  --bg-tertiary: #0369a1; /* Medium ocean */
  --bg-hover: #0284c7; /* Lighter ocean */
  --bg-active: #0ea5e9; /* Sky blue */
  --bg-overlay: rgba(6, 182, 212, 0.7); /* Cyan overlay */

  /* Text Colors */
  --text-primary: #f0f9ff; /* Very light blue */
  --text-secondary: #e0f2fe; /* Light cyan */
  --text-tertiary: #bae6fd; /* Soft sky blue */
  --text-disabled: #7dd3fc; /* Light cyan */
  --text-inverse: #0c4a6e;

  /* Border Colors */
  --border-primary: #0369a1; /* Medium ocean */
  --border-secondary: #0284c7; /* Lighter ocean */
  --border-focus: #06b6d4; /* Bright cyan */

  /* Neutral Colors (Inverted scale) */
  --neutral-50: #0f172a;
  --neutral-100: #1e293b;
  --neutral-200: #334155;
  --neutral-300: #475569;
  --neutral-400: #64748b;
  --neutral-500: #94a3b8;
  --neutral-600: #cbd5e1;
  --neutral-700: #e2e8f0;
  --neutral-800: #f1f5f9;
  --neutral-900: #f8fafc;

  /* Semantic Colors - Seaside Theme */
  --success: #34d399; /* Green */
  --success-light: #065f46;
  --warning: #fbbf24; /* Amber */
  --warning-light: #78350f;
  --error: #f87171; /* Red */
  --error-light: #7f1d1d;
  --info: #06b6d4; /* Bright cyan */
  --info-light: #155e75;

  /* Shadow (Lighter shadows for dark theme) */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
}
```

#### Color Usage Rules - Charming Seaside Theme
- **Primary Ocean Teal** (#0891b2 light / #06b6d4 dark): Main buttons, links, active states - evokes ocean waters
- **Sky Blue** (#38bdf8): Secondary elements, hover states - like clear skies
- **Seafoam Green** (#2dd4bf): Accent highlights - fresh coastal tones
- **Coral** (#f97316): Special highlights, important alerts - warm beach accent
- **Sand Beige** (#fef3c7): Subtle backgrounds - beach sand inspiration
- **Deep Ocean Blue** (Dark theme backgrounds): Deep sea at night
- **Yellow**: Status indicator for "Received" orders (brighter in dark theme)
- **Green**: Status indicator for "Notified" orders (brighter in dark theme)
- **Backgrounds**: Light theme uses sky blue tints, dark theme uses deep ocean blues
- **Borders**: Light cyan borders in light theme, ocean blue in dark theme
- **Semantic Colors**: Adjusted for better contrast while maintaining seaside aesthetic

---

### 2.4 Theme Switching

#### Theme Toggle Component
- **Location**: Header or Settings page
- **Icon**: Sun/Moon icon toggle
- **Animation**: Smooth icon transition
- **Persistence**: Saved to user preferences

#### System Theme Detection
```css
/* Follow system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    /* Dark theme variables */
  }
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme]) {
    /* Light theme variables */
  }
}
```

---

---

### 2.5 Typography

#### Font Family
```css
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 
               'Fira Sans', 'Droid Sans', 'Helvetica Neue', 
               sans-serif;
--font-mono: 'Courier New', Courier, monospace;
```

#### Font Sizes & Hierarchy
```css
/* Headings */
--text-h1: 2rem;      /* 32px - Page titles */
--text-h2: 1.5rem;    /* 24px - Section headers */
--text-h3: 1.25rem;   /* 20px - Subsection headers */
--text-h4: 1.125rem;  /* 18px - Card titles */

/* Body */
--text-base: 1rem;    /* 16px - Default body text */
--text-sm: 0.875rem;  /* 14px - Secondary text, captions */
--text-xs: 0.75rem;   /* 12px - Labels, metadata */

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

#### Typography Usage
- **H1**: Main page titles (Order Management, Dashboard)
- **H2**: Section headers (Order List, Create Order)
- **H3**: Card titles, form section headers
- **Body**: Default text, descriptions
- **Small**: Timestamps, metadata, helper text
- **Mono**: Order IDs, phone numbers, product references

---

### 2.3 Spacing System

#### Spacing Scale (8px base unit)
```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

#### Spacing Rules
- **Tight spacing (4-8px)**: Related elements within a component
- **Normal spacing (16-24px)**: Between components in a layout
- **Loose spacing (32-48px)**: Between major sections

---

### 2.4 Border Radius & Shadows

#### Border Radius
```css
--radius-sm: 0.25rem;   /* 4px - Small elements */
--radius-md: 0.5rem;    /* 8px - Default buttons, inputs */
--radius-lg: 0.75rem;   /* 12px - Cards, modals */
--radius-xl: 1rem;      /* 16px - Large containers */
--radius-full: 9999px;  /* Pills, avatars */
```

#### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

---

## 3. Component Design Guidelines

### 3.1 Buttons

#### Button Variants
```typescript
// Primary Button (Main actions)
<Button variant="primary" size="md">
  Create Order
</Button>

// Secondary Button (Secondary actions)
<Button variant="secondary" size="md">
  Cancel
</Button>

// Danger Button (Destructive actions)
<Button variant="danger" size="md">
  Delete User
</Button>

// Ghost Button (Tertiary actions)
<Button variant="ghost" size="md">
  Clear Filters
</Button>
```

#### Button Sizes
- **Small (sm)**: 32px height - Table actions, compact spaces
- **Medium (md)**: 40px height - Default size
- **Large (lg)**: 48px height - Primary CTAs, mobile-friendly

#### Button States
- **Default**: Normal appearance
- **Hover**: Slightly darker, subtle shadow
- **Active**: Pressed state (slightly darker)
- **Disabled**: 50% opacity, no pointer events
- **Loading**: Spinner icon, disabled state

---

### 3.2 Input Fields

#### Input Types
- **Text Input**: Standard text entry
- **Number Input**: For quantities and prices (text input, no spinners)
- **Phone Input**: Formatted phone number input
- **Textarea**: Multi-line text (observations)
- **Select**: Dropdown selection (suppliers, status)
- **Date Picker**: Date range selection

#### Input States
- **Default**: Clear border, placeholder text
- **Focus**: Primary color border, shadow
- **Error**: Red border, error message below
- **Success**: Green border (when validated)
- **Disabled**: Gray background, no interaction

#### Input Guidelines
- **Labels**: Always visible, above input
- **Placeholders**: Helpful hints, not critical info
- **Helper Text**: Contextual help below input
- **Error Messages**: Clear, actionable error text
- **Required Fields**: Asterisk (*) or "Required" label

---

### 3.3 Order List View (Critical Component)

#### List Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Search Bar]              [Filters ▼] [Create Order]        │
├─────────────────────────────────────────────────────────────┤
│ Status │ Customer     │ Phone        │ Suppliers │ Total   │
├────────┼──────────────┼──────────────┼───────────┼─────────┤
│ 🟡     │ John Doe     │ +34 123...   │ Supplier A│ €59.98  │
│ RECEIVED│             │ [📱]         │ Supplier B│         │
├────────┼──────────────┼──────────────┼───────────┼─────────┤
│ 🟢     │ Jane Smith   │ +34 456...   │ Supplier C│ €125.50 │
│ NOTIFIED│             │ [✓ WhatsApp] │           │         │
└─────────────────────────────────────────────────────────────┘
```

#### Status Indicators
- **🟡 Yellow Badge**: "RECEIVED" - Merchandise received
- **🟢 Green Badge**: "NOTIFIED" - With method icon (📞 Call / ✓ WhatsApp)
- **⚪ Gray Badge**: "PENDING" - Waiting

#### Row Design
- **Hover State**: Light background highlight
- **Click**: Opens order detail view
- **Phone Number**: Clickable, underlined, opens WhatsApp
- **Compact**: Maximum information density
- **Alternating Rows**: Subtle background for readability

#### List Features
- **Sticky Header**: Header stays visible when scrolling
- **Sortable Columns**: Click headers to sort
- **Row Selection**: Optional checkbox for bulk actions
- **Virtual Scrolling**: For large lists (1000+ items)

---

### 3.4 Order Creation Form

#### Form Layout
```
┌─────────────────────────────────────────┐
│ Create New Order                        │
├─────────────────────────────────────────┤
│ Customer Information                    │
│ ┌─────────────────────────────────────┐ │
│ │ Name:        [_________________]     │ │
│ │ Phone: *     [_________________]     │ │
│ │ Observations:[_________________]     │ │
│ │              [_________________]     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Suppliers & Products                    │
│ ┌─────────────────────────────────────┐ │
│ │ Supplier 1: [Type to search or add] │ │
│ │             (chip input with hints) │ │
│ │             [ suggestions dropdown ]│ │
│ │             [+ Add Supplier]        │ │
│ │ ├─ Reference: [____] Qty: [__] €:[_]│ │
│ │ ├─ Reference: [____] Qty: [__] €:[_]│ │
│ │ [+ Add Product]                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Cancel]              [Create Order]    │
└─────────────────────────────────────────┘
```

#### Form Guidelines
- **Supplier Input = Free Text**: Users always type supplier names freely. Provide auto-complete hints from existing suppliers, but **never lock to a dropdown**.
- **Auto-Create Suppliers**: When user saves an order with a new supplier name, create that supplier automatically in the database.
- **Product Reference Input = Free Text**: Users always type product references freely. Provide auto-complete hints from existing products for that supplier, but **never lock to a dropdown**.
- **Auto-Create Products**: When user saves an order with a new product reference for a supplier, create that product automatically for that supplier in the database.
- **Progressive Disclosure**: Show suppliers/products as added
- **Dynamic Rows**: Easy add/remove for suppliers and products
- **Inline Validation**: Validate as user types
- **Clear Actions**: Prominent "Create" button
- **Auto-save Draft**: Optional save as draft feature

---

### 3.5 Status Update Modal

#### Modal Design
```
┌──────────────────────────────┐
│ Update Order Status          │
├──────────────────────────────┤
│ Current Status: 🟡 RECEIVED  │
│                              │
│ New Status:                  │
│ ○ PENDING                    │
│ ● RECEIVED                   │
│ ○ NOTIFIED - Call            │
│ ○ NOTIFIED - WhatsApp        │
│                              │
│ [Cancel]  [Update Status]    │
└──────────────────────────────┘
```

---

### 3.6 Search & Filter Panel

#### Search Bar
- **Placeholder**: "Search by customer, phone, order ID, product..."
- **Icon**: Magnifying glass (left side)
- **Clear Button**: X icon when text entered
- **Real-time**: Debounced search (300ms delay)

#### Filter Panel (Expandable)
```
┌─────────────────────────────┐
│ Filters                     │
├─────────────────────────────┤
│ Status:                      │
│ ☑ PENDING  ☑ RECEIVED       │
│ ☑ NOTIFIED                  │
│                             │
│ Date Range:                 │
│ [Start Date] [End Date]     │
│                             │
│ Supplier:                   │
│ [Select ▼]                  │
│                             │
│ [Clear All]  [Apply]        │
└─────────────────────────────┘
```

---

## 4. Layout Patterns

### 4.1 Main Application Layout

```
┌──────────────────────────────────────────────────────┐
│ Logo  │  Order Management        [User: John ▼]     │ ← Header
├───────┼──────────────────────────────────────────────┤
│       │                                              │
│ Nav   │                                              │
│       │         Main Content Area                    │
│ Home  │                                              │
│ Orders│                                              │
│       │                                              │
│ [Sup] │                                              │
│ Admin │                                              │
│       │                                              │
└───────┴──────────────────────────────────────────────┘
  Sidebar
```

#### Header
- **Height**: 64px
- **Content**: Logo, page title, user menu
- **Sticky**: Stays at top when scrolling
- **Background**: White with subtle shadow

#### Sidebar
- **Width**: 240px (collapsible to 64px)
- **Background**: Neutral-50
- **Active State**: Primary color highlight
- **Icons + Labels**: Clear navigation

#### Main Content
- **Padding**: 24px
- **Max Width**: 1400px (centered)
- **Background**: White

---

### 4.2 Page Layouts

#### List Page Layout
```
Header
├─ Title: "Orders"
├─ Action Buttons: [Create Order] [Export]
└─ Search & Filters: [Search Bar] [Filters]
────────────────────────────────────
Order List (Table/List View)
├─ Pagination Controls
└─ Results Count: "Showing 1-50 of 250"
```

#### Form Page Layout
```
Header
└─ Title: "Create Order" or "Edit Order"
────────────────────────────────────
Form Card (Centered, max-width: 800px)
├─ Form Sections
├─ Action Buttons (Bottom Right)
└─ Cancel/Back Link
```

---

## 5. Interaction Patterns

### 5.1 Loading States

#### Skeleton Screens
- Show skeleton placeholders while loading
- Match the structure of actual content
- Smooth fade-in when data loads

#### Spinners
- Use for button actions (inline spinner)
- Full-page spinner for initial load
- Progress indicators for long operations

---

### 5.2 Feedback & Notifications

#### Toast Notifications
```
┌─────────────────────────────────────┐
│ ✓ Order created successfully        │
└─────────────────────────────────────┘
```
- **Success**: Green, checkmark icon
- **Error**: Red, X icon
- **Info**: Blue, info icon
- **Warning**: Yellow, warning icon
- **Position**: Top-right
- **Duration**: 3-5 seconds (auto-dismiss)
- **Dismissible**: Manual close button

#### Inline Messages
- Form validation errors below inputs
- Success messages after form submission
- Contextual help text

---

### 5.3 Empty States

#### Empty Order List
```
┌──────────────────────────────┐
│   [Illustration/Icon]        │
│                              │
│   No orders found            │
│                              │
│   Create your first order    │
│   [Create Order]             │
└──────────────────────────────┘
```

#### Empty Search Results
```
┌──────────────────────────────┐
│   No results found           │
│                              │
│   Try adjusting your filters │
│   [Clear Filters]            │
└──────────────────────────────┘
```

---

### 5.4 Confirmation Dialogs

#### Delete Confirmation
```
┌─────────────────────────────────┐
│ ⚠️ Delete User?                 │
├─────────────────────────────────┤
│ Are you sure you want to delete │
│ user "john_doe"?                │
│                                 │
│ This action cannot be undone.   │
│                                 │
│ [Cancel]      [Delete User]     │
└─────────────────────────────────┘
```

---

## 6. Responsive Design

### 6.1 Breakpoints
```css
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small laptops */
--breakpoint-xl: 1280px;  /* Desktop */
--breakpoint-2xl: 1536px; /* Large desktop */
```

### 6.2 Desktop Optimization
- **Minimum Width**: 1024px
- **Optimal Width**: 1280px - 1920px
- **Multi-column layouts** for wider screens
- **Hover states** for better desktop interaction

---

## 7. Accessibility Guidelines

### 7.1 Keyboard Navigation
- **Tab Order**: Logical flow through form fields
- **Enter**: Submit forms, activate buttons
- **Escape**: Close modals, cancel actions
- **Arrow Keys**: Navigate lists, dropdowns
- **Shortcuts**: Common actions (Ctrl+N: New Order)

### 7.2 Screen Reader Support
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Alt Text**: Images have descriptive alt text
- **Semantic HTML**: Use proper HTML5 semantic elements
- **Focus Indicators**: Visible focus rings

### 7.3 Color Contrast
- **Text on Background**: Minimum 4.5:1 ratio
- **Large Text**: Minimum 3:1 ratio
- **Interactive Elements**: Clear visual distinction
- **Status Colors**: Not the only indicator (use icons/text)

---

## 8. Animation & Transitions

### 8.1 Micro-interactions
- **Button Hover**: 150ms transition
- **Input Focus**: 200ms transition
- **Modal Open/Close**: 300ms fade + scale
- **List Item Hover**: 150ms background change

### 8.2 Loading Animations
- **Spinner**: Smooth rotation
- **Skeleton**: Pulse animation
- **Progress Bar**: Smooth fill animation

### 8.3 Animation Principles
- **Purposeful**: Animations should have meaning
- **Subtle**: Don't distract from content
- **Fast**: Users shouldn't wait for animations
- **Consistent**: Same transitions for same actions

---

## 9. Icon System

### 9.1 Icon Library
- **Library**: Lucide React / Heroicons
- **Size**: 16px, 20px, 24px variants
- **Style**: Outline (default), filled (selected)

### 9.2 Common Icons
- **Orders**: Package / Shopping Cart
- **Search**: Search / Magnifying Glass
- **Add**: Plus Circle
- **Edit**: Pencil / Edit
- **Delete**: Trash / X
- **Phone**: Phone
- **WhatsApp**: Message Circle
- **Status**: Circle (colored)
- **User**: User Circle
- **Settings**: Cog / Settings

---

## 10. Design Checklist

### Before Development
- [ ] Color palette defined and documented
- [ ] Typography system established
- [ ] Component library selected/configured
- [ ] Design system tokens created
- [ ] Key screens wireframed

### During Development
- [ ] Consistent spacing used throughout
- [ ] Colors match design system
- [ ] Typography hierarchy followed
- [ ] Interactive states implemented (hover, focus, active)
- [ ] Loading states included
- [ ] Error states handled gracefully
- [ ] Empty states designed
- [ ] Responsive behavior tested

### Before Launch
- [ ] Accessibility checked (keyboard navigation, screen readers)
- [ ] Color contrast validated
- [ ] All icons consistent style
- [ ] Animations smooth and purposeful
- [ ] Toast notifications implemented (no browser alerts)
- [ ] Confirmation modals for destructive actions
- [ ] Progress bars for long operations
- [ ] Image drag & drop for optional fields
- [ ] Cross-browser testing (Electron compatibility)
- [ ] User feedback incorporated

---

## 11. Modern UI Components Reference

For detailed implementation of modern UI components, see:
- **Toast Notifications**: [11_MODERN_UI_COMPONENTS.md](./11_MODERN_UI_COMPONENTS.md#1-toast-notification-system)
- **Confirmation Modals**: [11_MODERN_UI_COMPONENTS.md](./11_MODERN_UI_COMPONENTS.md#2-confirmation-modals)
- **Progress Bars**: [11_MODERN_UI_COMPONENTS.md](./11_MODERN_UI_COMPONENTS.md#3-progress-bars)
- **Image Drag & Drop**: [11_MODERN_UI_COMPONENTS.md](./11_MODERN_UI_COMPONENTS.md#4-image-drag--drop-upload)
- **Animation Guidelines**: [11_MODERN_UI_COMPONENTS.md](./11_MODERN_UI_COMPONENTS.md#5-animation-guidelines)

---

## Document Control

**Version**: 1.0  
**Last Updated**: November 2025  
**Designer**: Development Team

