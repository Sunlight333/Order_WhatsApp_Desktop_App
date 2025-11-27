import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { execSync } from 'child_process';

let prisma: PrismaClient;
let isInitialized = false;

/**
 * Get the database file path from DATABASE_URL
 */
function getDatabaseFilePath(): string | null {
  const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/database.db';
  const provider = process.env.DATABASE_PROVIDER || 'sqlite';
  
  if (provider !== 'sqlite') {
    return null; // Not SQLite, no file path
  }
  
  // Extract file path from DATABASE_URL
  if (databaseUrl.startsWith('file:')) {
    let filePath = databaseUrl.replace(/^file:/, '').trim();
    // Remove query parameters if any
    if (filePath.includes('?')) {
      filePath = filePath.split('?')[0];
    }
    // Resolve to absolute path
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  }
  
  return null;
}

/**
 * Ensure database directory exists
 */
async function ensureDatabaseDirectory(dbPath: string | null): Promise<void> {
  if (!dbPath) return;
  
  const dbDir = path.dirname(dbPath);
  try {
    await fs.access(dbDir);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(dbDir, { recursive: true });
    console.log(`✅ Created database directory: ${dbDir}`);
  }
}

/**
 * Check if database needs initialization (empty or doesn't exist)
 */
async function needsInitialization(dbPath: string | null): Promise<boolean> {
  if (!dbPath) return false; // Not SQLite
  
  try {
    const stats = await fs.stat(dbPath);
    // If file exists but is empty (0 bytes), needs initialization
    return stats.size === 0;
  } catch {
    // File doesn't exist, needs initialization
    return true;
  }
}

/**
 * Create database schema from Prisma schema
 * This creates all tables based on the Prisma schema
 */
async function createDatabaseSchema(): Promise<void> {
  const prismaClient = getPrismaClient();
  
  try {
    console.log('📦 Creating database schema...');
    
    // Create all tables based on Prisma schema
    // This SQL is generated from the schema.prisma file
    const createTablesSQL = `
      -- Create users table
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "avatar" TEXT,
        "whatsappMessage" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create suppliers table
      CREATE TABLE IF NOT EXISTS "suppliers" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create products table
      CREATE TABLE IF NOT EXISTS "products" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "supplierId" TEXT NOT NULL,
        "reference" TEXT NOT NULL,
        "description" TEXT,
        "defaultPrice" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE("supplierId", "reference")
      );

      -- Create orders table
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "customerName" TEXT,
        "customerPhone" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "notificationMethod" TEXT,
        "observations" TEXT,
        "createdById" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "notifiedAt" DATETIME,
        FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );

      -- Create indexes on orders
      CREATE INDEX IF NOT EXISTS "orders_customerPhone_idx" ON "orders"("customerPhone");
      CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");
      CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt");

      -- Create orderSuppliers table
      CREATE TABLE IF NOT EXISTS "orderSuppliers" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderId" TEXT NOT NULL,
        "supplierId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE("orderId", "supplierId")
      );

      -- Create orderProducts table
      CREATE TABLE IF NOT EXISTS "orderProducts" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderId" TEXT NOT NULL,
        "supplierId" TEXT NOT NULL,
        "productRef" TEXT NOT NULL,
        "quantity" TEXT NOT NULL,
        "price" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      -- Create index on orderProducts
      CREATE INDEX IF NOT EXISTS "orderProducts_orderId_idx" ON "orderProducts"("orderId");

      -- Create auditLogs table
      CREATE TABLE IF NOT EXISTS "auditLogs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "fieldChanged" TEXT,
        "oldValue" TEXT,
        "newValue" TEXT,
        "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "metadata" TEXT,
        FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );

      -- Create indexes on auditLogs
      CREATE INDEX IF NOT EXISTS "auditLogs_orderId_idx" ON "auditLogs"("orderId");
      CREATE INDEX IF NOT EXISTS "auditLogs_userId_idx" ON "auditLogs"("userId");
      CREATE INDEX IF NOT EXISTS "auditLogs_timestamp_idx" ON "auditLogs"("timestamp");

      -- Create config table
      CREATE TABLE IF NOT EXISTS "config" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Execute the SQL to create all tables
    await prismaClient.$executeRawUnsafe(createTablesSQL);
    console.log('✅ Database schema created successfully');
    
    // Seed initial data if database is empty
    await seedInitialData(prismaClient);
    
  } catch (error: any) {
    // If tables already exist, that's okay
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('✅ Database schema already exists');
    } else {
      console.error('❌ Failed to create database schema:', error.message);
      throw error;
    }
  }
}

/**
 * Seed initial data (admin user, default config)
 */
async function seedInitialData(prismaClient: PrismaClient): Promise<void> {
  try {
    // Check if admin user exists using Prisma query
    const adminUser = await prismaClient.user.findUnique({
      where: { username: 'admin' },
    });
    
    if (!adminUser) {
      console.log('🌱 Seeding initial data...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Use Prisma client to create user (handles UUID generation)
      await prismaClient.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
        },
      });
      
      console.log('✅ Admin user created (username: admin, password: admin123)');
      
      // Create default config
      try {
        await prismaClient.config.upsert({
          where: { key: 'whatsapp_default_message' },
          update: {},
          create: {
            key: 'whatsapp_default_message',
            value: 'Hola, tu pedido está listo para recoger.',
          },
        });
        console.log('✅ Default config created');
      } catch (configError) {
        // Config might already exist, that's okay
      }
    }
  } catch (error: any) {
    console.warn('⚠️  Could not seed initial data:', error.message);
  }
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // Use default if DATABASE_URL is not set (for development)
    const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/database.db';
    const provider = process.env.DATABASE_PROVIDER || 'sqlite';

    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    // SQLite-specific optimizations
    if (provider === 'sqlite') {
      // These will be set after connection
    }
  }

  return prisma;
}

/**
 * Initialize database connection and schema
 */
export async function initializeDatabaseConnection(): Promise<void> {
  if (isInitialized) return;
  
  const provider = process.env.DATABASE_PROVIDER || 'sqlite';
  const dbPath = getDatabaseFilePath();
  
  // Ensure database directory exists (for SQLite)
  if (dbPath) {
    await ensureDatabaseDirectory(dbPath);
  }
  
  const prismaClient = getPrismaClient();
  
  try {
    // Connect to database
    await prismaClient.$connect();
    console.log('✅ Database connected');
    
    // SQLite-specific optimizations
    if (provider === 'sqlite') {
      await prismaClient.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
      await prismaClient.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
      await prismaClient.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
    }
    
    // Check if database needs initialization
    if (dbPath && await needsInitialization(dbPath)) {
      await createDatabaseSchema();
    } else if (dbPath) {
      // Check if tables exist
      try {
        const tables = await prismaClient.$queryRaw<Array<{ name: string }>>`
          SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
        `;
        
        if (tables.length === 0) {
          console.log('📦 Database file exists but is empty, creating schema...');
          await createDatabaseSchema();
        }
      } catch (error) {
        // If query fails, try to create schema anyway
        console.log('📦 Creating database schema...');
        await createDatabaseSchema();
      }
    }
    
    isInitialized = true;
  } catch (error: any) {
    console.error('❌ Failed to connect to database:', error.message);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    isInitialized = false;
  }
}

