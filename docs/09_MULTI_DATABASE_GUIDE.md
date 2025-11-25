# Multi-Database Support Guide
## SQLite (Default) + MySQL/PostgreSQL (Optional)

### Version: 1.0

---

## 1. Overview

The application supports **three database providers**:
- **SQLite** (Default) - File-based, zero configuration
- **MySQL** (Optional) - Remote database server
- **PostgreSQL** (Optional) - Remote database server

**Default Recommendation**: SQLite for most use cases. Use MySQL/PostgreSQL only if you need advanced features or have existing database infrastructure.

---

## 2. Database Selection

### 2.1 When to Use SQLite (Default)

✅ **Use SQLite if:**
- You want zero configuration setup
- You're running on a single local network
- You don't need advanced database features
- You want easy backup (just copy a file)
- You have moderate data volume (< 10GB database)
- You want the simplest deployment

**Best for**: Small to medium businesses, desktop deployments, quick setup

### 2.2 When to Use MySQL/PostgreSQL

✅ **Use MySQL/PostgreSQL if:**
- You have existing database infrastructure
- You need advanced querying capabilities
- You expect very high data volumes
- You need complex reporting/analytics
- You want database-level replication
- You have database administration expertise

**Best for**: Large organizations, existing infrastructure, advanced requirements

---

## 3. Configuration

### 3.1 Configuration Structure

```typescript
interface DatabaseConfig {
  type: 'sqlite' | 'mysql' | 'postgresql';
  
  // SQLite Configuration
  path?: string;  // Database file path (optional, uses default if empty)
  
  // MySQL/PostgreSQL Configuration
  host?: string;         // Database server host
  port?: number;         // Database server port
  username?: string;     // Database username
  password?: string;     // Database password (encrypted)
  database?: string;     // Database name
  connectionString?: string;  // Full connection string (alternative)
}
```

### 3.2 Settings Page Configuration

#### SQLite Configuration (Default)

```
Database Type: [SQLite ▼]
┌─────────────────────────────┐
│ ● SQLite (Recommended)      │
│ ○ MySQL                     │
│ ○ PostgreSQL                │
└─────────────────────────────┘

Database File Path:
[Auto (Recommended)        ]
☑ Use default location

Default Location:
%APPDATA%\OrderApp\database.db
```

#### MySQL Configuration

```
Database Type: [MySQL ▼]
┌─────────────────────────────┐
│ ○ SQLite (Recommended)      │
│ ● MySQL                     │
│ ○ PostgreSQL                │
└─────────────────────────────┘

Connection Settings:
Host:     [localhost          ]
Port:     [3306               ]
Database: [order_db           ]
Username: [root               ]
Password: [••••••••           ]  [Show]

[Test Connection] ✓ Connected
```

#### PostgreSQL Configuration

```
Database Type: [PostgreSQL ▼]
┌─────────────────────────────┐
│ ○ SQLite (Recommended)      │
│ ○ MySQL                     │
│ ● PostgreSQL                │
└─────────────────────────────┘

Connection Settings:
Host:     [localhost          ]
Port:     [5432               ]
Database: [order_db           ]
Username: [postgres           ]
Password: [••••••••           ]  [Show]

[Test Connection] ✓ Connected
```

---

## 4. Prisma Schema Configuration

### 4.1 Dynamic Schema Generation

The Prisma schema supports all three databases dynamically:

```prisma
// server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = env("DATABASE_PROVIDER")  // sqlite | mysql | postgresql
  url      = env("DATABASE_URL")
}

// All models work across all databases
model User {
  id        String   @id @default(uuid())  // Works on all
  username  String   @unique
  password  String
  role      UserRole
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  SUPER_ADMIN
  USER
}
```

### 4.2 Database-Specific Considerations

#### UUIDs
- **All Databases**: Use `String` type with `@default(uuid())`
- Prisma handles UUID generation consistently
- No database-specific UUID types needed

#### Enums
- **MySQL/PostgreSQL**: Native enum support
- **SQLite**: Stored as strings, validated at application level
- Same schema works for all

#### Date/Time
- **All Databases**: `DateTime` type works consistently
- Prisma handles timezone differences

#### Text Fields
- **SQLite**: `TEXT` type
- **MySQL**: `TEXT` or `VARCHAR`
- **PostgreSQL**: `TEXT`
- Prisma maps automatically

---

## 5. Connection String Format

### 5.1 SQLite Connection String

```typescript
// Format
`file:${path}`

// Examples
"file:./database.db"
"file:C:\\Users\\John\\AppData\\Roaming\\OrderApp\\database.db"
"file:/home/user/.config/OrderApp/database.db"
```

### 5.2 MySQL Connection String

```typescript
// Format
`mysql://${username}:${password}@${host}:${port}/${database}`

// Example
"mysql://root:mypassword@localhost:3306/order_db"

// With SSL (optional)
"mysql://root:mypassword@localhost:3306/order_db?ssl=true"
```

### 5.3 PostgreSQL Connection String

```typescript
// Format
`postgresql://${username}:${password}@${host}:${port}/${database}`

// Example
"postgresql://postgres:mypassword@localhost:5432/order_db"

// With SSL (optional)
"postgresql://postgres:mypassword@localhost:5432/order_db?sslmode=require"
```

---

## 6. Implementation

### 6.1 Database Client Initialization

```typescript
// server/src/database/prisma.ts
import { PrismaClient } from '@prisma/client';
import { ConfigManager } from '../../../electron/config-manager';

let prisma: PrismaClient | null = null;

export function getPrismaClient(configManager: ConfigManager): PrismaClient {
  if (prisma) {
    return prisma;
  }

  const dbConfig = configManager.getDatabaseConfig();
  const connectionString = configManager.getDatabaseConnectionString();

  // Set environment variables for Prisma
  process.env.DATABASE_PROVIDER = dbConfig.type;
  process.env.DATABASE_URL = connectionString;

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  });

  // SQLite-specific optimizations
  if (dbConfig.type === 'sqlite') {
    initializeSQLiteOptimizations(prisma);
  }

  return prisma;
}

async function initializeSQLiteOptimizations(client: PrismaClient) {
  await client.$executeRaw`PRAGMA journal_mode = WAL;`;
  await client.$executeRaw`PRAGMA synchronous = NORMAL;`;
  await client.$executeRaw`PRAGMA foreign_keys = ON;`;
  await client.$executeRaw`PRAGMA cache_size = -64000;`; // 64MB cache
}
```

### 6.2 Database Connection Test

```typescript
// server/src/utils/database-test.util.ts
import { PrismaClient } from '@prisma/client';

export async function testDatabaseConnection(
  type: 'sqlite' | 'mysql' | 'postgresql',
  connectionString: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Set environment for Prisma
    process.env.DATABASE_PROVIDER = type;
    process.env.DATABASE_URL = connectionString;

    const client = new PrismaClient({
      datasources: {
        db: { url: connectionString },
      },
    });

    // Test connection
    await client.$connect();
    await client.$queryRaw`SELECT 1`;
    await client.$disconnect();

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Database connection failed',
    };
  }
}
```

---

## 7. Migrations

### 7.1 Migration Strategy

**Option 1: Separate Migration Folders** (Recommended)

```
prisma/
├── migrations/
│   ├── sqlite/
│   │   └── migrations/
│   ├── mysql/
│   │   └── migrations/
│   └── postgresql/
│       └── migrations/
└── schema.prisma
```

**Option 2: Database-Agnostic Migrations**

- Use Prisma's schema introspection
- Generate migrations based on current provider
- Store provider-specific migrations separately

### 7.2 Running Migrations

```bash
# For SQLite
DATABASE_PROVIDER=sqlite DATABASE_URL="file:./database.db" \
  npx prisma migrate dev

# For MySQL
DATABASE_PROVIDER=mysql DATABASE_URL="mysql://user:pass@host:port/db" \
  npx prisma migrate dev

# For PostgreSQL
DATABASE_PROVIDER=postgresql DATABASE_URL="postgresql://user:pass@host:port/db" \
  npx prisma migrate dev
```

---

## 8. Password Encryption

### 8.1 Storing Database Passwords

**Important**: Never store passwords in plain text!

```typescript
// electron/config-manager.ts
import { encrypt, decrypt } from './encryption.util';

export class ConfigManager {
  async save(config: Partial<AppConfig>) {
    // Encrypt password before saving
    if (config.database?.password) {
      config.database.password = encrypt(config.database.password);
    }
    
    // Save to file
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  async load(): Promise<AppConfig> {
    const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    
    // Decrypt password when loading
    if (config.database?.password) {
      config.database.password = decrypt(config.database.password);
    }
    
    return config;
  }
}
```

### 8.2 Simple Encryption Utility

```typescript
// electron/encryption.util.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

---

## 9. Switching Databases

### 9.1 From SQLite to MySQL/PostgreSQL

**Steps:**
1. Backup SQLite database
2. Configure MySQL/PostgreSQL connection in settings
3. Test connection
4. Run migrations on new database
5. Import data (if needed)
6. Restart application

**Data Migration:**
- Export from SQLite: `sqlite3 database.db .dump > backup.sql`
- Import to MySQL/PostgreSQL: Requires data transformation
- Consider using Prisma migrations or custom migration script

### 9.2 From MySQL/PostgreSQL to SQLite

**Steps:**
1. Export data from current database
2. Change database type to SQLite in settings
3. Run migrations on SQLite
4. Import data
5. Restart application

---

## 10. Best Practices

### 10.1 Database Selection Guidelines

| Scenario | Recommended Database |
|----------|---------------------|
| First time setup | SQLite |
| Small team (< 10 users) | SQLite |
| Large team (> 10 users) | MySQL/PostgreSQL |
| High data volume (> 1GB) | MySQL/PostgreSQL |
| Existing DB infrastructure | MySQL/PostgreSQL |
| Need complex queries | MySQL/PostgreSQL |
| Simple setup needed | SQLite |

### 10.2 Performance Optimization

**SQLite:**
- Enable WAL mode (done automatically)
- Optimize cache size
- Regular VACUUM operations

**MySQL:**
- Proper indexing
- Connection pooling
- Query optimization

**PostgreSQL:**
- Proper indexing
- Connection pooling
- Query optimization
- Analyze tables regularly

---

## 11. Troubleshooting

### 11.1 Connection Issues

**SQLite:**
- Check file permissions
- Ensure directory exists
- Check disk space

**MySQL/PostgreSQL:**
- Verify server is running
- Check network connectivity
- Verify credentials
- Check firewall rules
- Verify database exists

### 11.2 Migration Issues

- Ensure database is empty before first migration
- Check database user permissions
- Verify schema compatibility
- Review migration logs

---

## Document Control

**Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Complete

