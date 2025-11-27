import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

export interface DatabaseTestConfig {
  type: 'sqlite' | 'mysql' | 'postgresql';
  url?: string;
  path?: string;
}

export interface DatabaseTestResult {
  success: boolean;
  message: string;
  error?: string;
  initialized?: boolean; // Indicates if database was initialized
}

/**
 * Create database schema for SQLite database
 */
async function createDatabaseSchema(prismaClient: PrismaClient): Promise<void> {
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
  
  await prismaClient.$executeRawUnsafe(createTablesSQL);
}

/**
 * Seed initial data (admin user, default config)
 */
async function seedInitialData(prismaClient: PrismaClient): Promise<void> {
  try {
    // Check if admin user exists
    const adminUser = await prismaClient.user.findUnique({
      where: { username: 'admin' },
    });
    
    if (!adminUser) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await prismaClient.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
        },
      });
      
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
      } catch (configError) {
        // Config might already exist, that's okay
      }
    }
  } catch (error: any) {
    console.warn('⚠️  Could not seed initial data:', error.message);
  }
}

/**
 * Check if database needs initialization (empty or no tables)
 */
async function needsInitialization(prismaClient: PrismaClient, dbType: string): Promise<boolean> {
  try {
    if (dbType === 'sqlite') {
      // Check if any tables exist
      const tables = await prismaClient.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
      `;
      return tables.length === 0;
    } else {
      // For MySQL/PostgreSQL, try to query users table
      try {
        await prismaClient.$queryRaw`SELECT 1 FROM users LIMIT 1`;
        return false; // Table exists
      } catch {
        return true; // Table doesn't exist
      }
    }
  } catch {
    return true; // Assume needs initialization if check fails
  }
}

/**
 * Initialize database schema and seed data
 */
async function initializeDatabase(
  prismaClient: PrismaClient,
  dbType: string,
  connectionUrl: string
): Promise<void> {
  try {
    // Ensure database directory exists for SQLite
    if (dbType === 'sqlite') {
      const filePath = connectionUrl.replace(/^file:/, '').split('?')[0]; // Remove query params
      if (filePath) {
        // Resolve to absolute path
        const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
        const dbDir = path.dirname(fullPath);
        try {
          await fs.access(dbDir);
        } catch {
          await fs.mkdir(dbDir, { recursive: true });
        }
      }
    }

    // Check if database needs initialization
    const needsInit = await needsInitialization(prismaClient, dbType);
    
    if (needsInit) {
      if (dbType === 'sqlite') {
        // Set SQLite optimizations
        await prismaClient.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
        await prismaClient.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
        await prismaClient.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
        
        // Create schema
        await createDatabaseSchema(prismaClient);
        
        // Seed data
        await seedInitialData(prismaClient);
      }
      // Note: MySQL/PostgreSQL initialization would require migrations
      // For now, we only auto-initialize SQLite databases
    }
  } catch (error: any) {
    console.warn('⚠️  Could not initialize database:', error.message);
    throw error;
  }
}

/**
 * Test database connection with given configuration
 * Automatically initializes database if it's empty (SQLite only)
 */
export async function testDatabaseConnection(
  config: DatabaseTestConfig
): Promise<DatabaseTestResult> {
  let testPrisma: PrismaClient | null = null;
  let connectionUrl: string = '';

  try {
    // Determine connection URL
    if (config.type === 'sqlite') {
      if (!config.path && !config.url) {
        return {
          success: false,
          message: 'SQLite database path is required',
          error: 'MISSING_PATH',
        };
      }
      // Handle both 'file:./path' and './path' formats
      const dbPath = config.path || config.url?.replace(/^file:/, '') || '';
      connectionUrl = dbPath.startsWith('file:') ? dbPath : `file:${dbPath}`;
    } else {
      if (!config.url) {
        return {
          success: false,
          message: 'Database connection URL is required',
          error: 'MISSING_URL',
        };
      }
      connectionUrl = config.url;
    }

    // Create a temporary Prisma client with test configuration
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
      log: [],
    });

    // Test the connection
    await testPrisma.$connect();

    // For SQLite, check if the database file is accessible
    if (config.type === 'sqlite') {
      try {
        await testPrisma.$queryRaw`SELECT 1`;
      } catch (error: any) {
        return {
          success: false,
          message: `Database file is not accessible: ${error.message}`,
          error: error.code || 'FILE_ERROR',
        };
      }
      
      // Try to initialize database if it's empty
      try {
        await initializeDatabase(testPrisma, config.type, connectionUrl);
        return {
          success: true,
          message: `Successfully connected to ${config.type.toUpperCase()} database. Database schema initialized.`,
          initialized: true,
        };
      } catch (initError: any) {
        // If initialization fails but connection works, still report success
        // but note that initialization failed
        console.warn('Initialization warning:', initError.message);
        return {
          success: true,
          message: `Successfully connected to ${config.type.toUpperCase()} database.`,
          initialized: false,
        };
      }
    } else {
      // For MySQL/PostgreSQL, test with a simple query
      try {
        await testPrisma.$queryRaw`SELECT 1`;
      } catch (error: any) {
        return {
          success: false,
          message: `Connection failed: ${error.message}`,
          error: error.code || 'CONNECTION_ERROR',
        };
      }

      return {
        success: true,
        message: `Successfully connected to ${config.type.toUpperCase()} database`,
        initialized: false,
      };
    }
  } catch (error: any) {
    // Handle specific error cases
    if (error.code === 'P1001') {
      return {
        success: false,
        message: 'Cannot reach database server. Check host, port, and network connection.',
        error: 'CANNOT_REACH_DATABASE',
      };
    }
    
    if (error.code === 'P1000') {
      return {
        success: false,
        message: 'Authentication failed. Check username and password.',
        error: 'AUTHENTICATION_FAILED',
      };
    }

    if (error.code === 'ENOENT' || error.message?.includes('no such file')) {
      // For SQLite, try to create the database file if it doesn't exist
      if (config.type === 'sqlite' && testPrisma) {
        try {
          // Ensure directory exists and create empty database file
          const dbPath = connectionUrl.replace(/^file:/, '').split('?')[0]; // Remove query params
          if (dbPath) {
            const fullPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
            const dbDir = path.dirname(fullPath);
            await fs.mkdir(dbDir, { recursive: true });
            // SQLite will create the file on first connection, so try again
            await testPrisma.$connect();
            await initializeDatabase(testPrisma, config.type, connectionUrl);
            return {
              success: true,
              message: `Database created and initialized successfully.`,
              initialized: true,
            };
          }
        } catch (createError: any) {
          return {
            success: false,
            message: `Failed to create database: ${createError.message}`,
            error: 'DATABASE_CREATION_FAILED',
          };
        }
      }
      
      return {
        success: false,
        message: 'Database file not found. Please check the path.',
        error: 'FILE_NOT_FOUND',
      };
    }

    return {
      success: false,
      message: error.message || 'Failed to connect to database',
      error: error.code || 'UNKNOWN_ERROR',
    };
  } finally {
    // Clean up the test connection
    if (testPrisma) {
      try {
        await testPrisma.$disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
    }
  }
}

