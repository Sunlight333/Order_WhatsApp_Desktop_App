/**
 * Electron Main Entry Point (Development Mode)
 * This file loads the TypeScript main.ts file using tsx in development
 * For production, Electron will use the compiled JavaScript version
 */

// Load backend environment variables BEFORE loading TypeScript file
// This ensures env vars are available when backend modules are imported
const path = require('path');
const dotenv = require('dotenv');

// Resolve backend .env path relative to this file
const backendEnvPath = path.resolve(__dirname, 'backend/.env');

// Load .env file from backend directory
dotenv.config({ path: backendEnvPath });

// Set default values if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./prisma/database.db';
}
if (!process.env.PORT) {
  process.env.PORT = '3000';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'change-me-in-production';
}

// Register TypeScript loader
// tsx/cjs automatically registers when required
require('tsx/cjs');

// Load the TypeScript main file (now with env vars loaded)
require('./electron/main.ts');
