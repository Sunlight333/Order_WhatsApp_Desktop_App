import { disconnectDatabase } from '../config/database';
import fs from 'fs/promises';
import path from 'path';
import { createError } from '../utils/error.util';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { env } from '../config/env';
import os from 'os';

const execAsync = promisify(exec);

// Magic header to identify encrypted backup files
const ENCRYPTED_HEADER = 'ENCRYPTED_DB_BACKUP_v1\x00';
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000; // Number of iterations for key derivation

/**
 * Encrypt data with password
 */
function encryptData(data: Buffer, password: string): Buffer {
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive encryption key from password using PBKDF2
  const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt data
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  
  // Get authentication tag
  const tag = cipher.getAuthTag();

  // Combine: header + salt + iv + tag + encrypted data
  return Buffer.concat([
    Buffer.from(ENCRYPTED_HEADER, 'utf-8'),
    salt,
    iv,
    tag,
    encrypted,
  ]);
}

/**
 * Decrypt data with password
 */
function decryptData(encryptedData: Buffer, password: string): Buffer {
  try {
    // Check magic header
    const headerBuffer = Buffer.from(ENCRYPTED_HEADER, 'utf-8');
    if (!encryptedData.slice(0, headerBuffer.length).equals(headerBuffer)) {
      throw createError('INVALID_ENCRYPTED_FILE', 'File does not appear to be an encrypted backup', 400);
    }

    // Extract components
    let offset = headerBuffer.length;
    const salt = encryptedData.slice(offset, offset + SALT_LENGTH);
    offset += SALT_LENGTH;
    const iv = encryptedData.slice(offset, offset + IV_LENGTH);
    offset += IV_LENGTH;
    const tag = encryptedData.slice(offset, offset + TAG_LENGTH);
    offset += TAG_LENGTH;
    const encrypted = encryptedData.slice(offset);

    // Derive decryption key from password
    const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt data
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted;
  } catch (error: any) {
    if (error.code === 'INVALID_ENCRYPTED_FILE') {
      throw error;
    }
    throw createError('DECRYPTION_FAILED', 'Failed to decrypt backup file. Incorrect password?', 400);
  }
}

/**
 * Check if a file is encrypted
 */
function isEncrypted(data: Buffer): boolean {
  const headerBuffer = Buffer.from(ENCRYPTED_HEADER, 'utf-8');
  return data.length >= headerBuffer.length && 
         data.slice(0, headerBuffer.length).equals(headerBuffer);
}

/**
 * Get database provider type
 */
function getDatabaseProvider(): 'sqlite' | 'mysql' | 'postgresql' {
  return env.database.provider || (process.env.DATABASE_PROVIDER as 'sqlite' | 'mysql' | 'postgresql') || 'sqlite';
}

/**
 * Parse MySQL connection URL to extract connection details
 */
function parseMySQLUrl(url: string): { host: string; port: number; user: string; password: string; database: string } {
  // Format: mysql://user:password@host:port/database
  const match = url.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):?(\d+)?\/(.+)$/);
  if (!match) {
    throw createError('INVALID_MYSQL_URL', 'Invalid MySQL connection URL format', 400);
  }
  
  return {
    user: decodeURIComponent(match[1]),
    password: decodeURIComponent(match[2]),
    host: match[3],
    port: match[4] ? parseInt(match[4], 10) : 3306,
    database: match[5].split('?')[0], // Remove query parameters
  };
}

/**
 * Parse PostgreSQL connection URL to extract connection details
 */
function parsePostgreSQLUrl(url: string): { host: string; port: number; user: string; password: string; database: string } {
  // Format: postgresql://user:password@host:port/database?params
  const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):?(\d+)?\/(.+)$/);
  if (!match) {
    throw createError('INVALID_POSTGRESQL_URL', 'Invalid PostgreSQL connection URL format', 400);
  }
  
  return {
    user: decodeURIComponent(match[1]),
    password: decodeURIComponent(match[2]),
    host: match[3],
    port: match[4] ? parseInt(match[4], 10) : 5432,
    database: match[5].split('?')[0], // Remove query parameters
  };
}

/**
 * Create MySQL backup using mysqldump
 */
async function backupMySQL(password?: string, customPath?: string): Promise<{ path: string; size: number; encrypted: boolean }> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw createError('DATABASE_URL_NOT_SET', 'DATABASE_URL environment variable is not set', 400);
  }

  const conn = parseMySQLUrl(databaseUrl);
  
  // Use custom path if provided, otherwise use default location
  let backupPath: string;
  if (customPath) {
    backupPath = customPath;
    // Ensure the directory exists
    const backupDir = path.dirname(backupPath);
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }
  } else {
    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups');
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileExtension = password ? '.encrypted.omw' : '.omw';
    const backupFileName = `mysql_backup_${timestamp}${fileExtension}`;
    backupPath = path.join(backupDir, backupFileName);
  }

  // Build mysqldump command
  // Use environment variable for password to avoid showing it in process list
  const env = { ...process.env, MYSQL_PWD: conn.password };
  const dumpCommand = `mysqldump -h ${conn.host} -P ${conn.port} -u ${conn.user} ${conn.database} --single-transaction --routines --triggers`;

  try {
    // Execute mysqldump
    const { stdout } = await execAsync(dumpCommand, { env, maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer
    
    // Encrypt if password provided
    const dumpData = Buffer.from(stdout, 'utf-8');
    const backupData = password ? encryptData(dumpData, password) : dumpData;

    // Write backup file
    await fs.writeFile(backupPath, backupData);

    // Get file size
    const stats = await fs.stat(backupPath);
    const sizeInMB = stats.size / (1024 * 1024);

    return {
      path: backupPath,
      size: Math.round(sizeInMB * 100) / 100,
      encrypted: !!password,
    };
  } catch (error: any) {
    if (error.message?.includes('mysqldump')) {
      throw createError(
        'MYSQLDUMP_NOT_FOUND',
        'mysqldump command not found. Please ensure MySQL client tools are installed.',
        500
      );
    }
    throw createError('MYSQL_BACKUP_FAILED', `Failed to create MySQL backup: ${error.message}`, 500);
  }
}

/**
 * Create PostgreSQL backup using pg_dump
 */
async function backupPostgreSQL(password?: string, customPath?: string): Promise<{ path: string; size: number; encrypted: boolean }> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw createError('DATABASE_URL_NOT_SET', 'DATABASE_URL environment variable is not set', 400);
  }

  const conn = parsePostgreSQLUrl(databaseUrl);
  
  // Use custom path if provided, otherwise use default location
  let backupPath: string;
  if (customPath) {
    backupPath = customPath;
    // Ensure the directory exists
    const backupDir = path.dirname(backupPath);
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }
  } else {
    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups');
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileExtension = password ? '.encrypted.omw' : '.omw';
    const backupFileName = `postgresql_backup_${timestamp}${fileExtension}`;
    backupPath = path.join(backupDir, backupFileName);
  }

  // Build pg_dump command with connection string in environment variable
  const pgPasswordEnv = { ...process.env, PGPASSWORD: conn.password };
  const dumpCommand = `pg_dump -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} --no-owner --no-acl`;

  try {
    // Execute pg_dump
    const { stdout } = await execAsync(dumpCommand, { env: pgPasswordEnv, maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer
    
    // Encrypt if password provided
    const dumpData = Buffer.from(stdout, 'utf-8');
    const backupData = password ? encryptData(dumpData, password) : dumpData;

    // Write backup file
    await fs.writeFile(backupPath, backupData);

    // Get file size
    const stats = await fs.stat(backupPath);
    const sizeInMB = stats.size / (1024 * 1024);

    return {
      path: backupPath,
      size: Math.round(sizeInMB * 100) / 100,
      encrypted: !!password,
    };
  } catch (error: any) {
    if (error.message?.includes('pg_dump')) {
      throw createError(
        'PG_DUMP_NOT_FOUND',
        'pg_dump command not found. Please ensure PostgreSQL client tools are installed.',
        500
      );
    }
    throw createError('POSTGRESQL_BACKUP_FAILED', `Failed to create PostgreSQL backup: ${error.message}`, 500);
  }
}

/**
 * Get the database file path from DATABASE_URL (SQLite only)
 */
function getDatabasePath(): string {
  const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/database.db';
  
  // Extract path from SQLite connection string (file:./path/to/db.db)
  if (databaseUrl.startsWith('file:')) {
    let filePath = databaseUrl.replace(/^file:/, '').trim();
    
    // Remove query parameters if any
    if (filePath.includes('?')) {
      filePath = filePath.split('?')[0];
    }
    
    // Handle absolute paths
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    
    // Resolve relative paths from current working directory
    const directPath = path.resolve(process.cwd(), filePath);
    
    // Return the path (we'll check existence later)
    return directPath;
  }
  
  // Default path - try multiple common locations
  const defaultPaths = [
    path.resolve(process.cwd(), 'prisma', 'database.db'),
    path.resolve(process.cwd(), 'backend', 'prisma', 'database.db'),
    path.resolve(process.cwd(), 'database.db'),
  ];
  
  // Return first default path (existence will be checked in backupDatabase)
  return defaultPaths[0];
}

/**
 * Find the actual database file path (checks multiple locations)
 */
async function findDatabaseFile(): Promise<string> {
  const primaryPath = getDatabasePath();
  
  // Check primary path first
  try {
    await fs.access(primaryPath);
    return primaryPath;
  } catch {
    // Try alternative locations
    const alternativePaths = [
      path.resolve(process.cwd(), 'backend', 'prisma', 'database.db'),
      path.resolve(process.cwd(), 'prisma', 'database.db'),
      path.resolve(process.cwd(), 'database.db'),
      path.resolve(__dirname, '..', '..', 'prisma', 'database.db'),
      path.resolve(__dirname, '..', 'prisma', 'database.db'),
    ];
    
    for (const altPath of alternativePaths) {
      try {
        await fs.access(altPath);
        return altPath;
      } catch {
        // Continue searching
      }
    }
    
    // If not found, throw error with helpful message
    const searchedPaths = [primaryPath, ...alternativePaths].join('\n- ');
    throw createError(
      'DATABASE_NOT_FOUND',
      `Database file not found. Searched in:\n- ${searchedPaths}\n\nPlease ensure the database file exists or set DATABASE_URL environment variable correctly. Current DATABASE_URL: ${process.env.DATABASE_URL || 'not set'}`,
      404
    );
  }
}

/**
 * Create a backup of the database
 * @param password Optional password to encrypt the backup
 * @param customPath Optional custom file path where to save the backup
 */
export async function backupDatabase(password?: string, customPath?: string): Promise<{ path: string; size: number; encrypted: boolean }> {
  try {
    const provider = getDatabaseProvider();

    // Route to appropriate backup function based on database provider
    if (provider === 'mysql') {
      return await backupMySQL(password, customPath);
    } else if (provider === 'postgresql') {
      return await backupPostgreSQL(password, customPath);
    } else {
      // SQLite backup (existing implementation)
      // Find the database file first (we need it to read the data and optionally determine backup path)
      const dbPath = await findDatabaseFile();
      
      // Use custom path if provided, otherwise use default location
      let backupPath: string;
      
      if (customPath) {
        backupPath = customPath;
        // Ensure the directory exists
        const backupDir = path.dirname(backupPath);
        try {
          await fs.access(backupDir);
        } catch {
          await fs.mkdir(backupDir, { recursive: true });
        }
      } else {
        // Create backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                         new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const dbName = path.basename(dbPath, path.extname(dbPath));
        const backupDir = path.join(path.dirname(dbPath), 'backups');
        const fileExtension = password ? '.encrypted.omw' : '.omw';
        const backupFileName = `${dbName}_backup_${timestamp}${fileExtension}`;
        backupPath = path.join(backupDir, backupFileName);

        // Create backups directory if it doesn't exist
        try {
          await fs.access(backupDir);
        } catch {
          await fs.mkdir(backupDir, { recursive: true });
        }
      }

      // Read database file
      const dbData = await fs.readFile(dbPath);

      // Encrypt if password provided
      const backupData = password ? encryptData(dbData, password) : dbData;

      // Write backup file to the chosen location
      await fs.writeFile(backupPath, backupData);

      // Get file size
      const stats = await fs.stat(backupPath);
      const sizeInMB = stats.size / (1024 * 1024);

      return {
        path: backupPath,
        size: Math.round(sizeInMB * 100) / 100, // Round to 2 decimal places
        encrypted: !!password,
      };
    }
  } catch (error: any) {
    // If it's already an ApiError, rethrow it
    if (error instanceof Error && 'code' in error) {
      throw error;
    }
    throw createError('BACKUP_FAILED', `Failed to create database backup: ${error.message}`, 500);
  }
}

/**
 * Restore MySQL database from SQL dump
 */
async function restoreMySQL(backupFilePath: string, password?: string): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw createError('DATABASE_URL_NOT_SET', 'DATABASE_URL environment variable is not set', 400);
  }

  const conn = parseMySQLUrl(databaseUrl);

  // Read and decrypt backup file if needed
  let sqlData: Buffer;
  try {
    const fileBuffer = await fs.readFile(backupFilePath);
    
    // Check if encrypted
    const encrypted = isEncrypted(fileBuffer);
    if (encrypted && !password) {
      throw createError('PASSWORD_REQUIRED', 'This backup file is encrypted. Password is required.', 400);
    }

    // Decrypt if needed
    if (encrypted) {
      sqlData = decryptData(fileBuffer, password!);
    } else {
      sqlData = fileBuffer;
    }
  } catch (error: any) {
    if (error.code === 'PASSWORD_REQUIRED' || error.code === 'DECRYPTION_FAILED' || error.code === 'INVALID_ENCRYPTED_FILE') {
      throw error;
    }
    throw createError('BACKUP_NOT_FOUND', 'Backup file not found or cannot be read', 404);
  }

  // Disconnect Prisma
  await disconnectDatabase();

  // Write SQL to temporary file and restore from it (use .sql extension for MySQL command compatibility)
  const tempFile = path.join(os.tmpdir(), `mysql_restore_${Date.now()}.sql`);
  
  try {
    await fs.writeFile(tempFile, sqlData);

    // Execute mysql restore from file
    const envVars = { ...process.env, MYSQL_PWD: conn.password };
    const command = `mysql -h ${conn.host} -P ${conn.port} -u ${conn.user} ${conn.database} < ${tempFile}`;
    
    // Use shell command to handle input redirection
    await execAsync(command, {
      env: envVars,
      maxBuffer: 50 * 1024 * 1024,
      shell: os.platform() === 'win32' ? 'cmd.exe' : '/bin/bash',
    });
  } catch (error: any) {
    if (error.message?.includes('mysql')) {
      throw createError(
        'MYSQL_NOT_FOUND',
        'mysql command not found. Please ensure MySQL client tools are installed.',
        500
      );
    }
    throw createError('MYSQL_RESTORE_FAILED', `Failed to restore MySQL database: ${error.message}`, 500);
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Restore PostgreSQL database from SQL dump
 */
async function restorePostgreSQL(backupFilePath: string, password?: string): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw createError('DATABASE_URL_NOT_SET', 'DATABASE_URL environment variable is not set', 400);
  }

  const conn = parsePostgreSQLUrl(databaseUrl);

  // Read and decrypt backup file if needed
  let sqlData: Buffer;
  try {
    const fileBuffer = await fs.readFile(backupFilePath);
    
    // Check if encrypted
    const encrypted = isEncrypted(fileBuffer);
    if (encrypted && !password) {
      throw createError('PASSWORD_REQUIRED', 'This backup file is encrypted. Password is required.', 400);
    }

    // Decrypt if needed
    if (encrypted) {
      sqlData = decryptData(fileBuffer, password!);
    } else {
      sqlData = fileBuffer;
    }
  } catch (error: any) {
    if (error.code === 'PASSWORD_REQUIRED' || error.code === 'DECRYPTION_FAILED' || error.code === 'INVALID_ENCRYPTED_FILE') {
      throw error;
    }
    throw createError('BACKUP_NOT_FOUND', 'Backup file not found or cannot be read', 404);
  }

  // Disconnect Prisma
  await disconnectDatabase();

  // Write SQL to temporary file and restore from it (use .sql extension for PostgreSQL command compatibility)
  const tempFile = path.join(os.tmpdir(), `postgresql_restore_${Date.now()}.sql`);
  
  try {
    await fs.writeFile(tempFile, sqlData);

    // Execute psql restore from file
    const pgPasswordEnv = { ...process.env, PGPASSWORD: conn.password };
    const command = `psql -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} -f ${tempFile}`;
    
    await execAsync(command, {
      env: pgPasswordEnv,
      maxBuffer: 50 * 1024 * 1024,
      shell: os.platform() === 'win32' ? 'cmd.exe' : '/bin/bash',
    });
  } catch (error: any) {
    if (error.message?.includes('psql')) {
      throw createError(
        'PSQL_NOT_FOUND',
        'psql command not found. Please ensure PostgreSQL client tools are installed.',
        500
      );
    }
    throw createError('POSTGRESQL_RESTORE_FAILED', `Failed to restore PostgreSQL database: ${error.message}`, 500);
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Restore database from a backup file
 * @param backupFilePath Path to the backup file
 * @param password Optional password if the backup is encrypted
 */
export async function restoreDatabase(backupFilePath: string, password?: string): Promise<void> {
  try {
    // Validate backup file exists
    try {
      await fs.access(backupFilePath);
    } catch {
      throw createError('BACKUP_NOT_FOUND', 'Backup file not found', 404);
    }

    const provider = getDatabaseProvider();

    // Route to appropriate restore function based on database provider
    if (provider === 'mysql') {
      return await restoreMySQL(backupFilePath, password);
    } else if (provider === 'postgresql') {
      return await restorePostgreSQL(backupFilePath, password);
    } else {
      // SQLite restore (existing implementation)
      // Read backup file
      const fileBuffer = await fs.readFile(backupFilePath);

      // Check if file is encrypted
      const encrypted = isEncrypted(fileBuffer);

      // If encrypted, require password
      if (encrypted && !password) {
        throw createError('PASSWORD_REQUIRED', 'This backup file is encrypted. Password is required.', 400);
      }

      // Decrypt if encrypted
      let dbData: Buffer;
      if (encrypted) {
        try {
          dbData = decryptData(fileBuffer, password!);
        } catch (error: any) {
          if (error.code === 'DECRYPTION_FAILED' || error.code === 'INVALID_ENCRYPTED_FILE') {
            throw error;
          }
          throw createError('DECRYPTION_FAILED', 'Failed to decrypt backup file. Incorrect password?', 400);
        }
      } else {
        dbData = fileBuffer;
      }

      // Validate it's a valid SQLite file (check file header)
      const sqliteHeader = dbData.toString('utf-8', 0, 16);
      if (!sqliteHeader.startsWith('SQLite format 3')) {
        throw createError('INVALID_BACKUP', 'File is not a valid SQLite database', 400);
      }

      // Get the database path (try to find existing, otherwise use default)
      let dbPath: string;
      try {
        dbPath = await findDatabaseFile();
      } catch {
        // Database doesn't exist yet, use default path from getDatabasePath()
        dbPath = getDatabasePath();
        // Ensure directory exists
        const dbDir = path.dirname(dbPath);
        try {
          await fs.access(dbDir);
        } catch {
          await fs.mkdir(dbDir, { recursive: true });
        }
      }
      
      // Disconnect Prisma to ensure no locks on database
      await disconnectDatabase();

      // Create a backup of current database before restoring (safety measure)
      try {
        await fs.access(dbPath);
        const safetyBackupPath = `${dbPath}.pre_restore_${Date.now()}`;
        await fs.copyFile(dbPath, safetyBackupPath);
      } catch {
        // Current database doesn't exist, that's ok - we'll create it from the backup
      }

      // Write decrypted/unencrypted data to database location
      await fs.writeFile(dbPath, dbData);

      // Note: Prisma client will be recreated on next use automatically
    }
  } catch (error: any) {
    if (error.code === 'BACKUP_NOT_FOUND' || error.code === 'INVALID_BACKUP' || 
        error.code === 'PASSWORD_REQUIRED' || error.code === 'DECRYPTION_FAILED' ||
        error.code === 'INVALID_ENCRYPTED_FILE') {
      throw error;
    }
    throw createError('RESTORE_FAILED', `Failed to restore database: ${error.message}`, 500);
  }
}

/**
 * Get list of available backups
 */
/**
 * Check if a backup file is encrypted
 */
export async function checkBackupEncryption(backupFilePath: string): Promise<{ encrypted: boolean }> {
  try {
    await fs.access(backupFilePath);
    const headerBuffer = Buffer.from(ENCRYPTED_HEADER, 'utf-8');
    const fileBuffer = await fs.readFile(backupFilePath);
    // Only check the first bytes
    const headerSlice = fileBuffer.slice(0, headerBuffer.length);
    return { encrypted: isEncrypted(headerSlice) };
  } catch (error: any) {
    throw createError('CHECK_ENCRYPTION_FAILED', `Failed to check backup encryption: ${error.message}`, 500);
  }
}

/**
 * Get list of available backups
 */
export async function listBackups(): Promise<Array<{ filename: string; path: string; size: number; createdAt: Date; encrypted: boolean }>> {
  try {
    const provider = getDatabaseProvider();
    
    // Determine backup directory based on provider
    let backupDir: string;
    if (provider === 'sqlite') {
      // Find database file to determine backup directory location
      const dbPath = await findDatabaseFile().catch(() => getDatabasePath());
      backupDir = path.join(path.dirname(dbPath), 'backups');
    } else {
      // For MySQL/PostgreSQL, use a common backups directory
      backupDir = path.join(process.cwd(), 'backups');
    }

    // Check if backups directory exists
    try {
      await fs.access(backupDir);
    } catch {
      return []; // No backups directory means no backups
    }

    // Read all files in backups directory
    const files = await fs.readdir(backupDir);
    const backups: Array<{ filename: string; path: string; size: number; createdAt: Date; encrypted: boolean }> = [];

    for (const file of files) {
      // Include .omw and .encrypted.omw files (also support legacy .db and .sql files for backward compatibility)
      if (file.endsWith('.omw') || file.endsWith('.encrypted.omw') ||
          file.endsWith('.db') || file.endsWith('.encrypted.db') || 
          file.endsWith('.sql') || file.endsWith('.encrypted.sql')) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        // Check if encrypted by reading first bytes
        let isEncryptedBackup = false;
        try {
          const headerBuffer = Buffer.from(ENCRYPTED_HEADER, 'utf-8');
          const fileBuffer = await fs.readFile(filePath);
          // Only check the first bytes
          const headerSlice = fileBuffer.slice(0, headerBuffer.length);
          isEncryptedBackup = isEncrypted(headerSlice);
        } catch {
          // If we can't read, assume not encrypted
        }
        
        backups.push({
          filename: file,
          path: filePath,
          size: stats.size / (1024 * 1024), // Size in MB
          createdAt: stats.birthtime,
          encrypted: isEncryptedBackup,
        });
      }
    }

    // Sort by creation time (newest first)
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return backups;
  } catch (error: any) {
    throw createError('LIST_BACKUPS_FAILED', `Failed to list backups: ${error.message}`, 500);
  }
}

