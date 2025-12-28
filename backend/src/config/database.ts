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
    
    // Ensure foreign keys are enabled before creating tables with foreign key constraints
    try {
      await prismaClient.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
      console.log('   ✅ Foreign keys enabled');
    } catch (error: any) {
      console.warn('   ⚠️  Could not enable foreign keys:', error.message);
      // Continue anyway
    }
    
    // Define table creation statements (in dependency order)
    const tableStatements = [
      // Base tables first (no foreign keys)
      `CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "avatar" TEXT,
        "whatsappMessage" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS "suppliers" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS "customers" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "phone" TEXT,
        "countryCode" TEXT DEFAULT '+34',
        "description" TEXT,
        "createdById" TEXT,
        "updatedById" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS "config" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tables with foreign keys to users/suppliers
      `CREATE TABLE IF NOT EXISTS "products" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "supplierId" TEXT NOT NULL,
        "reference" TEXT NOT NULL,
        "description" TEXT,
        "defaultPrice" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE("supplierId", "reference")
      )`,
      
      `CREATE TABLE IF NOT EXISTS "orders" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderNumber" INTEGER,
        "customerName" TEXT,
        "customerId" TEXT,
        "customerPhone" TEXT,
        "countryCode" TEXT DEFAULT '+34',
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "notificationMethod" TEXT,
        "observations" TEXT,
        "cancellationReason" TEXT,
        "createdById" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "notifiedAt" DATETIME,
        FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )`,
      
      // Tables with foreign keys to orders
      `CREATE TABLE IF NOT EXISTS "orderSuppliers" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderId" TEXT NOT NULL,
        "supplierId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE("orderId", "supplierId")
      )`,
      
      `CREATE TABLE IF NOT EXISTS "orderProducts" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderId" TEXT NOT NULL,
        "supplierId" TEXT NOT NULL,
        "productRef" TEXT NOT NULL,
        "quantity" TEXT NOT NULL,
        "price" TEXT NOT NULL,
        "receivedQuantity" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS "auditLogs" (
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
      )`,
      
      `CREATE TABLE IF NOT EXISTS "customerAuditLogs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "customerId" TEXT,
        "userId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "fieldChanged" TEXT,
        "oldValue" TEXT,
        "newValue" TEXT,
        "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "metadata" TEXT,
        FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )`,
    ];
    
    // Define index creation statements (after tables exist)
    // Performance-optimized indexes for filtering and sorting
    const indexStatements = [
      `CREATE UNIQUE INDEX IF NOT EXISTS "orders_orderNumber_key" ON "orders"("orderNumber")`,
      // Order indexes for filtering
      `CREATE INDEX IF NOT EXISTS "orders_customerPhone_idx" ON "orders"("customerPhone")`,
      `CREATE INDEX IF NOT EXISTS "orders_customerId_idx" ON "orders"("customerId")`,
      `CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status")`,
      `CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "orders_updatedAt_idx" ON "orders"("updatedAt")`,
      `CREATE INDEX IF NOT EXISTS "orders_orderNumber_idx" ON "orders"("orderNumber")`,
      `CREATE INDEX IF NOT EXISTS "orders_createdById_idx" ON "orders"("createdById")`,
      // Composite indexes for common filter combinations
      `CREATE INDEX IF NOT EXISTS "orders_status_createdAt_idx" ON "orders"("status", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "orders_customerId_status_idx" ON "orders"("customerId", "status")`,
      // Supplier and product indexes
      `CREATE INDEX IF NOT EXISTS "orderSuppliers_supplierId_idx" ON "orderSuppliers"("supplierId")`,
      `CREATE INDEX IF NOT EXISTS "orderSuppliers_orderId_idx" ON "orderSuppliers"("orderId")`,
      `CREATE INDEX IF NOT EXISTS "customers_name_idx" ON "customers"("name")`,
      `CREATE INDEX IF NOT EXISTS "customers_createdById_idx" ON "customers"("createdById")`,
      `CREATE INDEX IF NOT EXISTS "customers_updatedById_idx" ON "customers"("updatedById")`,
      `CREATE INDEX IF NOT EXISTS "orderProducts_orderId_idx" ON "orderProducts"("orderId")`,
      `CREATE INDEX IF NOT EXISTS "orderProducts_supplierId_idx" ON "orderProducts"("supplierId")`,
      // Audit log indexes
      `CREATE INDEX IF NOT EXISTS "auditLogs_orderId_idx" ON "auditLogs"("orderId")`,
      `CREATE INDEX IF NOT EXISTS "auditLogs_userId_idx" ON "auditLogs"("userId")`,
      `CREATE INDEX IF NOT EXISTS "auditLogs_timestamp_idx" ON "auditLogs"("timestamp")`,
      `CREATE INDEX IF NOT EXISTS "customerAuditLogs_customerId_idx" ON "customerAuditLogs"("customerId")`,
      `CREATE INDEX IF NOT EXISTS "customerAuditLogs_userId_idx" ON "customerAuditLogs"("userId")`,
      `CREATE INDEX IF NOT EXISTS "customerAuditLogs_timestamp_idx" ON "customerAuditLogs"("timestamp")`,
    ];
    
    // Step 1: Create all tables first
    console.log('📦 Creating tables...');
    const createdTables: string[] = [];
    const failedTables: string[] = [];
    
    for (let i = 0; i < tableStatements.length; i++) {
      const statement = tableStatements[i];
      // Extract table name from statement for logging
      const tableNameMatch = statement.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/i);
      const tableName = tableNameMatch ? tableNameMatch[1] : `table_${i}`;
      
      try {
        await prismaClient.$executeRawUnsafe(statement);
        
        // Verify table was actually created
        const verifyResult = await prismaClient.$queryRawUnsafe<Array<{ name: string }>>(
          `SELECT name FROM sqlite_master WHERE type='table' AND name = '${tableName}'`
        );
        
        if (verifyResult.length > 0) {
          createdTables.push(tableName);
          console.log(`   ✅ Created table: ${tableName}`);
        } else {
          failedTables.push(tableName);
          console.error(`   ❌ Table ${tableName} creation appeared to succeed but table not found`);
        }
      } catch (error: any) {
        // Only ignore "already exists" errors for tables
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          // Table already exists, verify it
          try {
            const verifyResult = await prismaClient.$queryRawUnsafe<Array<{ name: string }>>(
              `SELECT name FROM sqlite_master WHERE type='table' AND name = '${tableName}'`
            );
            if (verifyResult.length > 0) {
              createdTables.push(tableName);
              console.log(`   ℹ️  Table already exists: ${tableName}`);
              continue;
            }
          } catch (verifyError) {
            // Verification failed, but table might still exist
          }
        }
        // For other errors, log with full details
        failedTables.push(tableName);
        console.error(`   ❌ Error creating table ${tableName}:`, error.message);
        console.error(`   Error code:`, error.code);
        console.error(`   Full error:`, error);
        // Try to continue with other tables
      }
    }
    
    console.log(`📦 Created ${createdTables.length}/${tableStatements.length} tables`);
    if (failedTables.length > 0) {
      console.error(`❌ Failed to create ${failedTables.length} tables: ${failedTables.join(', ')}`);
    }
    
    // Step 2: Verify all tables were created
    const tables = await prismaClient.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
    `;
    const tableNames = tables.map(t => t.name.toLowerCase());
    const requiredTables = ['users', 'orders', 'suppliers', 'products', 'customers', 'ordersuppliers', 'orderproducts', 'auditlogs', 'customerauditlogs', 'config'];
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.error(`❌ Missing tables after creation: ${missingTables.join(', ')}`);
      console.error(`   Found tables: ${tableNames.join(', ')}`);
      // Try to create missing tables individually with better error reporting
      for (const missingTable of missingTables) {
        console.log(`   Attempting to create missing table: ${missingTable}`);
        // This will help identify which table is failing
      }
      throw new Error(`Failed to create all required tables. Missing: ${missingTables.join(', ')}`);
    }
    
    console.log(`✅ All tables created successfully (${tables.length} tables found)`);
    
    // Step 3: Create indexes after tables are confirmed to exist
    console.log('📦 Creating indexes...');
    for (const statement of indexStatements) {
      try {
        await prismaClient.$executeRawUnsafe(statement);
      } catch (error: any) {
        // Ignore "already exists" and "no such table" errors for indexes
        if (error.message?.includes('already exists') || 
            error.message?.includes('duplicate') ||
            error.message?.includes('no such table')) {
          // Index already exists or table doesn't exist (shouldn't happen, but handle gracefully)
          continue;
        }
        console.warn(`⚠️  Warning creating index: ${error.message}`);
        console.warn(`   Statement: ${statement.substring(0, 80)}...`);
        // Don't throw - indexes are not critical
      }
    }
    
    console.log(`✅ Database schema created successfully (${tables.length} tables, ${indexStatements.length} indexes)`);
    
    // Step 4: Seed initial data
    await seedInitialData(prismaClient);
    
  } catch (error: any) {
    // If tables already exist, that's okay
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('✅ Database schema already exists');
    } else {
      console.error('❌ Failed to create database schema:', error.message);
      console.error('Error stack:', error.stack);
      // Don't throw - let server continue with degraded functionality
      console.warn('⚠️  Server will continue, but database operations may fail');
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
    try {
      await ensureDatabaseDirectory(dbPath);
    } catch (error: any) {
      console.error('⚠️  Failed to ensure database directory exists:', error.message);
      // Continue anyway - might still work
    }
  }
  
  const prismaClient = getPrismaClient();
  
  try {
    // Connect to database with retry logic
    let connected = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await prismaClient.$connect();
        connected = true;
        console.log('✅ Database connected');
        break;
      } catch (error: any) {
        console.warn(`⚠️  Database connection attempt ${attempt}/3 failed:`, error.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          throw error;
        }
      }
    }
    
    if (!connected) {
      throw new Error('Failed to connect to database after 3 attempts');
    }
    
    // SQLite-specific optimizations (use $queryRaw because PRAGMA returns results)
    if (provider === 'sqlite') {
      try {
        await prismaClient.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
        await prismaClient.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
        await prismaClient.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
      } catch (error: any) {
        console.warn('⚠️  Failed to set SQLite optimizations:', error.message);
        // Continue anyway
      }
    }
    
    // Check if database needs initialization
    if (dbPath && await needsInitialization(dbPath)) {
      console.log('📦 Database file is new or empty, creating schema...');
      try {
        await createDatabaseSchema();
        await seedInitialData(prismaClient);
      } catch (error: any) {
        console.error('⚠️  Failed to create database schema:', error.message);
        // Don't throw - allow server to start and retry later
      }
    } else if (dbPath) {
      // Check if tables exist - always verify schema is present
      let tablesExist = false;
      try {
        const tables = await prismaClient.$queryRaw<Array<{ name: string }>>`
          SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
        `;
        
        // Check for at least the main tables (users, orders, suppliers, products)
        const requiredTables = ['users', 'orders', 'suppliers', 'products'];
        const tableNames = tables.map(t => t.name.toLowerCase());
        tablesExist = requiredTables.every(table => tableNames.includes(table));
        
        if (!tablesExist) {
          console.log(`📦 Database file exists but schema is incomplete (found ${tables.length} tables, need at least ${requiredTables.length}), creating schema...`);
          try {
            await createDatabaseSchema();
            await seedInitialData(prismaClient);
          } catch (error: any) {
            console.error('⚠️  Failed to create missing database schema:', error.message);
            // Don't throw - allow server to start
          }
        } else {
          console.log(`✅ Database schema verified (${tables.length} tables found)`);
        }
        
        // ALWAYS check and upgrade schema for missing columns (for existing databases)
        // This runs regardless of whether tables were just created or already existed
        try {
          // Get table names once for all checks
          const tableNames = tables.map(t => t.name.toLowerCase());
          
          // Check and upgrade customers table FIRST (before orders, as it's more critical for current error)
          if (tableNames.includes('customers')) {
            const customerColumns = await prismaClient.$queryRaw<Array<{ name: string }>>`
              PRAGMA table_info("customers");
            `;
            const customerColumnNames = customerColumns.map(c => c.name.toLowerCase());
            console.log('📋 Current customers table columns:', customerColumnNames.join(', '));

            if (!customerColumnNames.includes('createdbyid')) {
              console.log('🛠️ Adding missing column customers.createdById');
              await prismaClient.$executeRawUnsafe(`ALTER TABLE "customers" ADD COLUMN "createdById" TEXT;`);
              await prismaClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customers_createdById_idx" ON "customers"("createdById");`);
              console.log('✅ Successfully added createdById column to customers table');
            } else {
              console.log('✅ Column customers.createdById already exists');
            }

            if (!customerColumnNames.includes('updatedbyid')) {
              console.log('🛠️ Adding missing column customers.updatedById');
              await prismaClient.$executeRawUnsafe(`ALTER TABLE "customers" ADD COLUMN "updatedById" TEXT;`);
              await prismaClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customers_updatedById_idx" ON "customers"("updatedById");`);
              console.log('✅ Successfully added updatedById column to customers table');
            } else {
              console.log('✅ Column customers.updatedById already exists');
            }
          }

          // Check and upgrade orders table
          if (tableNames.includes('orders')) {
            const orderColumns = await prismaClient.$queryRaw<Array<{ name: string }>>`
              PRAGMA table_info("orders");
            `;
            const orderColumnNames = orderColumns.map(c => c.name.toLowerCase());
            console.log('📋 Current orders table columns:', orderColumnNames.join(', '));

            if (!orderColumnNames.includes('ordernumber')) {
              console.log('🛠️ Adding missing column orders.orderNumber');
              await prismaClient.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN "orderNumber" INTEGER;`);
              await prismaClient.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "orders_orderNumber_key" ON "orders"("orderNumber");`);
            }
            if (!orderColumnNames.includes('customerid')) {
              console.log('🛠️ Adding missing column orders.customerId');
              await prismaClient.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN "customerId" TEXT;`);
              await prismaClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_customerId_idx" ON "orders"("customerId");`);
            }
            if (!orderColumnNames.includes('customerphone')) {
              console.log('🛠️ Adding missing column orders.customerPhone');
              await prismaClient.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN "customerPhone" TEXT;`);
              await prismaClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_customerPhone_idx" ON "orders"("customerPhone");`);
            }
            if (!orderColumnNames.includes('countrycode')) {
              console.log('🛠️ Adding missing column orders.countryCode');
              await prismaClient.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN "countryCode" TEXT DEFAULT '+34';`);
            }
            if (!orderColumnNames.includes('cancellationreason')) {
              console.log('🛠️ Adding missing column orders.cancellationReason');
              try {
                await prismaClient.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN "cancellationReason" TEXT;`);
                console.log('✅ Successfully added cancellationReason column');
              } catch (colError: any) {
                console.error('❌ Failed to add cancellationReason column:', colError.message);
                throw colError; // Re-throw to be caught by outer catch
              }
            } else {
              console.log('✅ Column orders.cancellationReason already exists');
            }
          }

          // Check and add customers table if missing
          if (!tableNames.includes('customers')) {
            console.log('🛠️ Creating missing customers table');
            await prismaClient.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS "customers" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "phone" TEXT,
                "countryCode" TEXT DEFAULT '+34',
                "description" TEXT,
                "createdById" TEXT,
                "updatedById" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
                FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
              );
            `);
            await prismaClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customers_name_idx" ON "customers"("name");`);
            await prismaClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customers_createdById_idx" ON "customers"("createdById");`);
            await prismaClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customers_updatedById_idx" ON "customers"("updatedById");`);
          }

          // Check orderProducts table for receivedQuantity column
          if (tableNames.includes('orderproducts')) {
            const orderProductColumns = await prismaClient.$queryRaw<Array<{ name: string }>>`
              PRAGMA table_info("orderProducts");
            `;
            const orderProductColumnNames = orderProductColumns.map(c => c.name);

            if (!orderProductColumnNames.includes('receivedQuantity')) {
              console.log('🛠️ Adding missing column orderProducts.receivedQuantity');
              await prismaClient.$executeRawUnsafe(`ALTER TABLE "orderProducts" ADD COLUMN "receivedQuantity" TEXT;`);
            }
          }
        } catch (upgradeError: any) {
          console.error('❌ Error during schema upgrade:', upgradeError.message);
          console.error('Error stack:', upgradeError.stack);
          // Don't continue silently - this is critical for app functionality
          // The upgrade will be retried on next server restart or can be done manually via /api/v1/database/upgrade
          throw upgradeError;
        }
        
        // Still seed data in case it's missing
        try {
          await seedInitialData(prismaClient);
        } catch (error: any) {
          console.warn('⚠️  Failed to seed initial data:', error.message);
          // Continue anyway
        }
      } catch (error: any) {
        // If query fails, try to create schema anyway
        console.log('📦 Error checking database schema, attempting to create schema...', error.message);
        try {
          await createDatabaseSchema();
          await seedInitialData(prismaClient);
        } catch (schemaError: any) {
          console.error('⚠️  Failed to create database schema after error:', schemaError.message);
          // Don't throw - allow server to start
        }
      }
    }
    
    isInitialized = true;
  } catch (error: any) {
    console.error('❌ Failed to connect to database:', error.message);
    console.error('⚠️  Server will continue, but database operations may fail');
    console.error('⚠️  The application will attempt to reconnect on next database operation');
    // Don't throw - let server start anyway
    // Set initialized to false so it can retry
    isInitialized = false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    try {
      await prisma.$disconnect();
      isInitialized = false;
    } catch (error: any) {
      console.warn('⚠️  Error disconnecting from database:', error.message);
      isInitialized = false;
    }
  }
}

/**
 * Reconnect to database if connection is lost
 */
export async function reconnectDatabase(): Promise<boolean> {
  try {
    if (prisma) {
      // Try to disconnect first
      try {
        await prisma.$disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      prisma = null as any;
      isInitialized = false;
    }
    
    // Reinitialize
    await initializeDatabaseConnection();
    return isInitialized;
  } catch (error: any) {
    console.error('❌ Failed to reconnect to database:', error.message);
    return false;
  }
}

/**
 * Check if database is connected and operational
 */
export async function isDatabaseConnected(): Promise<boolean> {
  if (!prisma || !isInitialized) {
    return false;
  }
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error: any) {
    console.warn('⚠️  Database connection check failed:', error.message);
    return false;
  }
}

/**
 * Upgrade database schema (add missing columns and tables)
 * This can be called manually to update an existing database
 */
export async function upgradeDatabaseSchema(): Promise<{ success: boolean; message: string; changes: string[] }> {
  const changes: string[] = [];
  
  if (!prisma || !isInitialized) {
    throw new Error('Database is not initialized');
  }

  const provider = process.env.DATABASE_PROVIDER || 'sqlite';
  
  if (provider !== 'sqlite') {
    return {
      success: false,
      message: 'Schema upgrade is only supported for SQLite databases',
      changes: [],
    };
  }

  try {
    // Check if orders table exists
    const tables = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='orders';
    `;

    if (tables.length === 0) {
      return {
        success: false,
        message: 'Orders table does not exist. Please initialize the database first.',
        changes: [],
      };
    }

    // Check and add missing columns to orders table
    const orderColumns = await prisma.$queryRaw<Array<{ name: string }>>`
      PRAGMA table_info("orders");
    `;
    const orderColumnNames = orderColumns.map(c => c.name.toLowerCase());

    if (!orderColumnNames.includes('cancellationreason')) {
      console.log('🛠️ Adding missing column orders.cancellationReason');
      await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN "cancellationReason" TEXT;`);
      changes.push('Added cancellationReason column to orders table');
    }

    // Check and add missing columns to customers table for traceability
    const customerColumns = await prisma.$queryRaw<Array<{ name: string }>>`
      PRAGMA table_info("customers");
    `;
    const customerColumnNames = customerColumns.map(c => c.name.toLowerCase());

    if (!customerColumnNames.includes('createdbyid')) {
      console.log('🛠️ Adding missing column customers.createdById');
      await prisma.$executeRawUnsafe(`ALTER TABLE "customers" ADD COLUMN "createdById" TEXT;`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customers_createdById_idx" ON "customers"("createdById");`);
      changes.push('Added createdById column to customers table');
    }

    if (!customerColumnNames.includes('updatedbyid')) {
      console.log('🛠️ Adding missing column customers.updatedById');
      await prisma.$executeRawUnsafe(`ALTER TABLE "customers" ADD COLUMN "updatedById" TEXT;`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customers_updatedById_idx" ON "customers"("updatedById");`);
      changes.push('Added updatedById column to customers table');
    }


    const message = changes.length > 0 
      ? `Schema upgraded successfully. ${changes.length} change(s) applied.`
      : 'Database schema is up to date. No changes needed.';

    return {
      success: true,
      message,
      changes,
    };
  } catch (error: any) {
    console.error('❌ Failed to upgrade database schema:', error.message);
    throw new Error(`Failed to upgrade database schema: ${error.message}`);
  }
}

