# Project Setup Guide

## Initial Setup Steps

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install electron dependencies
cd electron
npm install
cd ..
```

### 2. Set Up Environment Variables

```bash
# Copy backend environment example
cp backend/.env.example backend/.env

# Edit backend/.env with your configuration
# Default SQLite will work out of the box
```

### 3. Initialize Database

```bash
# Generate Prisma client
cd backend
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database with default admin user
npm run prisma:seed
cd ..
```

### 4. Start Development

```bash
# Start all services (backend, frontend, electron)
npm run dev

# Or start individually:
npm run dev:backend  # Express server on port 3000
npm run dev:frontend # Vite dev server on port 5173
npm run dev:electron # Electron app
```

## Default Credentials

After seeding:
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `SUPER_ADMIN`

⚠️ **Important**: Change the default password after first login!

## Project Structure

```
Order_WhatsApp_Desktop_App/
├── backend/           # Express.js API
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/          # React app
│   ├── src/
│   └── package.json
├── electron/          # Electron main process
│   ├── main.ts
│   └── package.json
├── shared/            # Shared types
│   └── src/
└── docs/              # Documentation
```

## Next Steps

1. ✅ Project structure created
2. ⏭️ Implement authentication endpoints
3. ⏭️ Create order management APIs
4. ⏭️ Build React components
5. ⏭️ Implement theme system
6. ⏭️ Add modern UI components

## Documentation

See `docs/README.md` for complete documentation index.

