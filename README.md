# Order Management Desktop Application

A professional desktop application for managing daily orders with WhatsApp integration, built with Electron, React, Express.js, and Prisma.

## 🌊 Charming Seaside Theme

Modern, beautiful UI with ocean-inspired colors - Ocean Teal, Sky Blue, Seafoam Green, and Coral accents.

## ✨ Features

- 📦 **Order Management**: Create, update, and track orders with multiple suppliers and products
- 👥 **Multi-User Support**: Concurrent access from multiple workstations
- 🔍 **Powerful Search**: Real-time search across orders, customers, products
- 📊 **Status Tracking**: Visual status indicators (Yellow for Received, Green for Notified)
- 📱 **WhatsApp Integration**: One-click WhatsApp messaging with pre-filled messages
- 📝 **Complete Audit Trail**: Track all changes with user attribution and timestamps
- 🌓 **Light & Dark Themes**: Beautiful seaside-inspired themes
- 🗄️ **Flexible Database**: SQLite (default), MySQL, or PostgreSQL support
- 🎨 **Modern UI**: Toast notifications, confirmation modals, progress bars, drag & drop

## 📚 Documentation

Complete documentation is available in the `docs/` directory:

- [Project Requirements](./docs/01_PROJECT_REQUIREMENTS.md)
- [System Architecture](./docs/02_SYSTEM_ARCHITECTURE.md)
- [API Design](./docs/03_API_DESIGN.md)
- [Development Roadmap](./docs/04_DEVELOPMENT_ROADMAP.md)
- [UI/UX Guidelines](./docs/05_UI_UX_GUIDELINES.md)
- [Codebase Rules](./docs/06_CODEBASE_RULES.md)
- [Peer-to-Peer Architecture](./docs/07_PEER_TO_PEER_ARCHITECTURE.md)
- [Implementation Solutions](./docs/08_IMPLEMENTATION_SOLUTIONS.md)
- [Multi-Database Guide](./docs/09_MULTI_DATABASE_GUIDE.md)
- [Theme Implementation](./docs/10_THEME_IMPLEMENTATION.md)
- [Modern UI Components](./docs/11_MODERN_UI_COMPONENTS.md)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- (Optional) MySQL or PostgreSQL for advanced database setup

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

## 🏗️ Project Structure

```
Order_WhatsApp_Desktop_App/
├── backend/              # Express.js backend API
├── frontend/             # React frontend
├── electron/             # Electron main process
├── shared/               # Shared types and utilities
├── docs/                 # Complete documentation
└── package.json          # Root package.json
```

## 🎨 Technology Stack

- **Frontend**: React + TypeScript + Electron
- **Backend**: Express.js + TypeScript
- **Database**: SQLite (default), MySQL, PostgreSQL
- **ORM**: Prisma
- **Styling**: CSS Variables (Theming)

## 📖 License

MIT

