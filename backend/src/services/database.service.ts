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
 * Create database schema for database
 */
async function createDatabaseSchema(prismaClient: PrismaClient, dbType: string = 'sqlite'): Promise<void> {
  // MySQL/PostgreSQL use different syntax for some things
  const isMySQL = dbType === 'mysql';
  const isPostgreSQL = dbType === 'postgresql';
  const textType = isMySQL ? 'TEXT' : isPostgreSQL ? 'TEXT' : 'TEXT';
  const datetimeType = isMySQL ? 'DATETIME' : isPostgreSQL ? 'TIMESTAMP' : 'DATETIME';
  const uuidType = isMySQL ? 'CHAR(36)' : isPostgreSQL ? 'UUID' : 'TEXT';
  
  // Use appropriate auto-increment/sequence for ID generation
  const idDefault = isPostgreSQL ? 'uuid_generate_v4()' : "REPLACE(UUID(), '-', '')";
  
  const createTablesSQL = `
    -- Create users table
    CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "username" TEXT NOT NULL UNIQUE,
      "password" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'USER',
      "avatar" TEXT,
      "whatsappMessage" TEXT,
      "createdAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Create suppliers table
    CREATE TABLE IF NOT EXISTS "suppliers" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "createdAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Create products table
    CREATE TABLE IF NOT EXISTS "products" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "supplierId" TEXT NOT NULL,
      "reference" TEXT NOT NULL,
      "description" TEXT,
      "defaultPrice" TEXT,
      "createdAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      UNIQUE("supplierId", "reference")
    );

    -- Create customers table
    CREATE TABLE IF NOT EXISTS "customers" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "phone" TEXT,
      "countryCode" TEXT DEFAULT '+34',
      "description" TEXT,
      "createdById" TEXT,
      "updatedById" TEXT,
      "createdAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );

    -- Create orders table
    CREATE TABLE IF NOT EXISTS "orders" (
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
      "createdAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "notifiedAt" ${datetimeType},
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );

    -- Create indexes on orders
    CREATE INDEX IF NOT EXISTS "orders_customerPhone_idx" ON "orders"("customerPhone");
    CREATE INDEX IF NOT EXISTS "orders_customerId_idx" ON "orders"("customerId");
    CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");
    CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt");
    CREATE INDEX IF NOT EXISTS "orders_orderNumber_idx" ON "orders"("orderNumber");

    -- Create orderSuppliers table
    CREATE TABLE IF NOT EXISTS "orderSuppliers" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "supplierId" TEXT NOT NULL,
      "createdAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
      "receivedQuantity" TEXT,
      "createdAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
      "timestamp" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "metadata" TEXT,
      FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );

    -- Create indexes on auditLogs
    CREATE INDEX IF NOT EXISTS "auditLogs_orderId_idx" ON "auditLogs"("orderId");
    CREATE INDEX IF NOT EXISTS "auditLogs_userId_idx" ON "auditLogs"("userId");
    CREATE INDEX IF NOT EXISTS "auditLogs_timestamp_idx" ON "auditLogs"("timestamp");

    -- Create customerAuditLogs table
    -- customerId is nullable to preserve history even if customer is deleted
    CREATE TABLE IF NOT EXISTS "customerAuditLogs" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "customerId" TEXT,
      "userId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "fieldChanged" TEXT,
      "oldValue" TEXT,
      "newValue" TEXT,
      "timestamp" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "metadata" TEXT,
      FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );

    -- Create indexes on customerAuditLogs
    CREATE INDEX IF NOT EXISTS "customerAuditLogs_customerId_idx" ON "customerAuditLogs"("customerId");
    CREATE INDEX IF NOT EXISTS "customerAuditLogs_userId_idx" ON "customerAuditLogs"("userId");
    CREATE INDEX IF NOT EXISTS "customerAuditLogs_timestamp_idx" ON "customerAuditLogs"("timestamp");

    -- Create config table
    CREATE TABLE IF NOT EXISTS "config" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "key" TEXT NOT NULL UNIQUE,
      "value" TEXT,
      "updatedAt" ${datetimeType} NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await prismaClient.$executeRawUnsafe(createTablesSQL);
}

/**
 * Seed initial data (admin user + default configs).
 * NOTE: This is used by the Desktop app "Initialize DB" flow and must stay in sync with the UI expectations.
 */
async function seedInitialData(prismaClient: PrismaClient): Promise<void> {
  try {
    // 1) Ensure admin user exists
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
    }

    // 2) Ensure default configs exist (independent of admin user existence)
    await prismaClient.config.upsert({
      where: { key: 'whatsapp_default_message' },
      update: {},
      create: {
        key: 'whatsapp_default_message',
        value: 'Hola, tu pedido está listo para recoger.',
      },
    });

    await prismaClient.config.upsert({
      where: { key: 'users_see_only_own_orders' },
      update: {},
      create: {
        key: 'users_see_only_own_orders',
        value: 'false', // Default: users can see all orders
      },
    });

    // IMPORTANT: PENDING means "pending receipt" (not "pending to notify")
    const defaultOrderStatusesConfig = {
      PENDING: {
        color: '#f59e0b',
        backgroundColor: '#fef3c7',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'normal',
        text: 'Pendiente de Recibir',
      },
      RECEIVED: {
        color: '#16a34a',
        backgroundColor: '#dcfce7',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'normal',
        text: 'Pendiente de avisar',
      },
      NOTIFIED_CALL: {
        color: '#16a34a',
        backgroundColor: '#dcfce7',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'normal',
        text: 'Avisado (Llamada)',
      },
      NOTIFIED_WHATSAPP: {
        color: '#16a34a',
        backgroundColor: '#dcfce7',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'normal',
        text: 'Avisado (WhatsApp)',
      },
      CANCELLED: {
        color: '#dc2626',
        backgroundColor: '#fee2e2',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'normal',
        text: 'Cancelado',
      },
      INCOMPLETO: {
        color: '#dc2626',
        backgroundColor: '#fee2e2',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'normal',
        text: 'Incompleto',
      },
      DELIVERED_COUNTER: {
        color: '#16a34a',
        backgroundColor: '#dcfce7',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'normal',
        text: 'Entregado en Mostrador',
      },
      READY_TO_SEND: {
        color: '#3b82f6',
        backgroundColor: '#dbeafe',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'normal',
        text: 'Preparado para enviar',
      },
    };

    // Upsert order_statuses_config - if it exists, merge with defaults to add any missing statuses
    const existingStatusConfig = await prismaClient.config.findUnique({
      where: { key: 'order_statuses_config' },
    });

    if (existingStatusConfig && existingStatusConfig.value) {
      try {
        const existing = JSON.parse(existingStatusConfig.value);
        // Merge with defaults to ensure all statuses (including READY_TO_SEND) are present
        const merged = { ...defaultOrderStatusesConfig, ...existing };
        // Ensure READY_TO_SEND is present with correct default
        if (!merged.READY_TO_SEND || merged.READY_TO_SEND.text !== defaultOrderStatusesConfig.READY_TO_SEND.text) {
          merged.READY_TO_SEND = defaultOrderStatusesConfig.READY_TO_SEND;
        }
        await prismaClient.config.update({
          where: { key: 'order_statuses_config' },
          data: { value: JSON.stringify(merged) },
        });
      } catch (error) {
        // If parsing fails, replace with defaults
        await prismaClient.config.update({
          where: { key: 'order_statuses_config' },
          data: { value: JSON.stringify(defaultOrderStatusesConfig) },
        });
      }
    } else {
      await prismaClient.config.upsert({
        where: { key: 'order_statuses_config' },
        update: {},
        create: {
          key: 'order_statuses_config',
          value: JSON.stringify(defaultOrderStatusesConfig),
        },
      });
    }
  } catch (error: any) {
    console.warn('⚠️  Could not seed initial data:', error.message);
  }
}

/**
 * Required tables for the application
 */
const REQUIRED_TABLES = [
  'users',
  'orders',
  'suppliers',
  'products',
  'customers',
  'orderSuppliers',
  'orderProducts',
  'auditLogs',
  'customerAuditLogs',
  'config',
];

/**
 * Check if database schema is complete (all required tables exist)
 */
async function isSchemaComplete(prismaClient: PrismaClient, dbType: string): Promise<boolean> {
  try {
    if (dbType === 'sqlite') {
      // Check if all required tables exist
      const tables = await prismaClient.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
      `;
      const tableNames = tables.map(t => t.name);
      const missingTables = REQUIRED_TABLES.filter(table => !tableNames.includes(table));
      
      if (missingTables.length > 0) {
        console.log(`📋 Schema incomplete. Missing tables: ${missingTables.join(', ')}`);
        return false;
      }

      // For existing databases, ensure new columns exist on critical tables
      // This allows older installations to be upgraded in-place without losing data.
      try {
        // Ensure new columns on orders table
        const orderColumns = await prismaClient.$queryRaw<Array<{ name: string }>>`
          PRAGMA table_info("orders");
        `;
        const orderColumnNames = orderColumns.map(c => c.name);

        if (!orderColumnNames.includes('orderNumber')) {
          console.log('🛠️ Adding missing column orders.orderNumber');
          await prismaClient.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN "orderNumber" INTEGER;`);
        }
        if (!orderColumnNames.includes('customerId')) {
          console.log('🛠️ Adding missing column orders.customerId');
          await prismaClient.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN "customerId" TEXT;`);
        }
        if (!orderColumnNames.includes('customerPhone')) {
          console.log('🛠️ Adding missing column orders.customerPhone');
          await prismaClient.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN "customerPhone" TEXT;`);
        }
        if (!orderColumnNames.includes('countryCode')) {
          console.log('🛠️ Adding missing column orders.countryCode');
          await prismaClient.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN "countryCode" TEXT DEFAULT '+34';`);
        }

        // Ensure new columns on orderProducts table
        const orderProductColumns = await prismaClient.$queryRaw<Array<{ name: string }>>`
          PRAGMA table_info("orderProducts");
        `;
        const orderProductColumnNames = orderProductColumns.map(c => c.name);

        if (!orderProductColumnNames.includes('receivedQuantity')) {
          console.log('🛠️ Adding missing column orderProducts.receivedQuantity');
          await prismaClient.$executeRawUnsafe(`ALTER TABLE "orderProducts" ADD COLUMN "receivedQuantity" TEXT;`);
        }

        // Ensure new columns on customers table for traceability
        const customerColumns = await prismaClient.$queryRaw<Array<{ name: string }>>`
          PRAGMA table_info("customers");
        `;
        const customerColumnNames = customerColumns.map(c => c.name.toLowerCase());

        if (!customerColumnNames.includes('createdbyid')) {
          console.log('🛠️ Adding missing column customers.createdById');
          await prismaClient.$executeRawUnsafe(`ALTER TABLE "customers" ADD COLUMN "createdById" TEXT;`);
          await prismaClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customers_createdById_idx" ON "customers"("createdById");`);
        }

        if (!customerColumnNames.includes('updatedbyid')) {
          console.log('🛠️ Adding missing column customers.updatedById');
          await prismaClient.$executeRawUnsafe(`ALTER TABLE "customers" ADD COLUMN "updatedById" TEXT;`);
          await prismaClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customers_updatedById_idx" ON "customers"("updatedById");`);
        }
      } catch (columnError: any) {
        console.warn('⚠️  Error while ensuring new columns exist:', columnError.message);
        // If column upgrade fails, treat schema as incomplete so initialization can retry
        return false;
      }

      return true;
    } else {
      // For MySQL/PostgreSQL, check each required table
      for (const tableName of REQUIRED_TABLES) {
        try {
          await prismaClient.$queryRawUnsafe(`SELECT 1 FROM ${tableName} LIMIT 1`);
        } catch {
          console.log(`📋 Schema incomplete. Missing table: ${tableName}`);
          return false;
        }
      }
      return true;
    }
  } catch (error: any) {
    console.warn('⚠️  Error checking schema completeness:', error.message);
    return false; // Assume incomplete if check fails
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
 * @param force - If true, force re-initialization even if tables exist
 */
export async function initializeDatabase(
  prismaClient: PrismaClient,
  dbType: string,
  connectionUrl: string,
  force: boolean = false
): Promise<{ success: boolean; message: string }> {
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

    // Check if database needs initialization (unless forcing)
    let needsInit = force || await needsInitialization(prismaClient, dbType);
    
    if (needsInit) {
      if (dbType === 'sqlite') {
        // Set SQLite optimizations (use $queryRaw because PRAGMA returns results)
        await prismaClient.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
        await prismaClient.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
        await prismaClient.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
        
        // Create schema
        await createDatabaseSchema(prismaClient, dbType);
        
        // Seed data
        await seedInitialData(prismaClient);
        
        return {
          success: true,
          message: 'Database initialized successfully. Default admin user created (username: admin, password: admin123).',
        };
      } else if (dbType === 'mysql' || dbType === 'postgresql') {
        // For MySQL/PostgreSQL, create schema compatible SQL
        await createDatabaseSchema(prismaClient, dbType);
        
        // Seed data
        await seedInitialData(prismaClient);
        
        return {
          success: true,
          message: 'Database initialized successfully. Default admin user created (username: admin, password: admin123).',
        };
      }
    } else if (force) {
      // Force mode: even if tables exist, ensure schema is complete and seeders run
      // Check if schema is actually complete
      const schemaComplete = await isSchemaComplete(prismaClient, dbType);
      
      if (!schemaComplete) {
        // Schema is incomplete, create missing tables
        if (dbType === 'sqlite') {
          await prismaClient.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
        }
        await createDatabaseSchema(prismaClient, dbType);
      }
      
      // Always run seeders in force mode to ensure initial data exists
      await seedInitialData(prismaClient);
      
      return {
        success: true,
        message: 'Database schema verified and seeders executed. Default admin user ensured (username: admin, password: admin123).',
      };
    }
    
    // Tables exist and not forcing - just ensure seeders are up to date
    await seedInitialData(prismaClient);
    
    return {
      success: true,
      message: 'Database already initialized. Tables exist. Seeders verified.',
    };
  } catch (error: any) {
    console.error('⚠️  Could not initialize database:', error.message);
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
      
      // Check if schema is complete, and initialize if needed
      try {
        const schemaComplete = await isSchemaComplete(testPrisma, config.type);
        let initialized = false;
        
        if (!schemaComplete) {
          console.log('📦 Schema is incomplete, running migrations and seeders...');
          // Force initialization to ensure all tables and seeders run
          await initializeDatabase(testPrisma, config.type, connectionUrl, true);
          initialized = true;
        } else {
          // Schema is complete, but always run seeders to ensure initial data exists
          console.log('📦 Schema is complete, ensuring seeders are up to date...');
          await seedInitialData(testPrisma);
          // Check if seeders created anything
          const adminUser = await testPrisma.user.findUnique({
            where: { username: 'admin' },
          });
          if (adminUser) {
            initialized = true; // Seeders were already run or just ran
          }
        }
        
        return {
          success: true,
          message: initialized 
            ? `Successfully connected to ${config.type.toUpperCase()} database. Database schema and seeders verified/initialized.`
            : `Successfully connected to ${config.type.toUpperCase()} database. Schema is up to date.`,
          initialized: initialized,
        };
      } catch (initError: any) {
        // If initialization fails but connection works, still report success
        // but note that initialization failed
        console.warn('Initialization warning:', initError.message);
        return {
          success: true,
          message: `Successfully connected to ${config.type.toUpperCase()} database. Warning: ${initError.message}`,
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

      // Check if schema is complete, and initialize if needed
      try {
        const schemaComplete = await isSchemaComplete(testPrisma, config.type);
        let initialized = false;
        
        if (!schemaComplete) {
          console.log('📦 Schema is incomplete, running migrations and seeders...');
          // Force initialization to ensure all tables and seeders run
          await initializeDatabase(testPrisma, config.type, connectionUrl, true);
          initialized = true;
        } else {
          // Schema is complete, but always run seeders to ensure initial data exists
          console.log('📦 Schema is complete, ensuring seeders are up to date...');
          await seedInitialData(testPrisma);
          initialized = true; // Seeders were verified/run
        }
        
        return {
          success: true,
          message: initialized 
            ? `Successfully connected to ${config.type.toUpperCase()} database. Database schema and seeders verified/initialized.`
            : `Successfully connected to ${config.type.toUpperCase()} database. Schema is up to date.`,
          initialized: initialized,
        };
      } catch (initError: any) {
        console.warn('Initialization warning:', initError.message);
        return {
          success: true,
          message: `Successfully connected to ${config.type.toUpperCase()} database. Warning: ${initError.message}`,
          initialized: false,
        };
      }
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
            // Force initialization to ensure all migrations and seeders run
            await initializeDatabase(testPrisma, config.type, connectionUrl, true);
            return {
              success: true,
              message: `Database created and initialized successfully. All migrations and seeders have been executed.`,
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

