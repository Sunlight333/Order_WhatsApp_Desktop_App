"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupDatabase = backupDatabase;
exports.restoreDatabase = restoreDatabase;
exports.checkBackupEncryption = checkBackupEncryption;
exports.listBackups = listBackups;
const database_1 = require("../config/database");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const error_util_1 = require("../utils/error.util");
const crypto_1 = __importDefault(require("crypto"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const env_1 = require("../config/env");
const os_1 = __importDefault(require("os"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
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
function encryptData(data, password) {
    // Generate random salt and IV
    const salt = crypto_1.default.randomBytes(SALT_LENGTH);
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    // Derive encryption key from password using PBKDF2
    const key = crypto_1.default.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
    // Create cipher
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
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
function decryptData(encryptedData, password) {
    try {
        // Check magic header
        const headerBuffer = Buffer.from(ENCRYPTED_HEADER, 'utf-8');
        if (!encryptedData.slice(0, headerBuffer.length).equals(headerBuffer)) {
            throw (0, error_util_1.createError)('INVALID_ENCRYPTED_FILE', 'File does not appear to be an encrypted backup', 400);
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
        const key = crypto_1.default.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
        // Create decipher
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        // Decrypt data
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted;
    }
    catch (error) {
        if (error.code === 'INVALID_ENCRYPTED_FILE') {
            throw error;
        }
        throw (0, error_util_1.createError)('DECRYPTION_FAILED', 'Failed to decrypt backup file. Incorrect password?', 400);
    }
}
/**
 * Check if a file is encrypted
 */
function isEncrypted(data) {
    const headerBuffer = Buffer.from(ENCRYPTED_HEADER, 'utf-8');
    return data.length >= headerBuffer.length &&
        data.slice(0, headerBuffer.length).equals(headerBuffer);
}
/**
 * Get database provider type
 */
function getDatabaseProvider() {
    return env_1.env.database.provider || process.env.DATABASE_PROVIDER || 'sqlite';
}
/**
 * Parse MySQL connection URL to extract connection details
 */
function parseMySQLUrl(url) {
    // Format: mysql://user:password@host:port/database
    const match = url.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):?(\d+)?\/(.+)$/);
    if (!match) {
        throw (0, error_util_1.createError)('INVALID_MYSQL_URL', 'Invalid MySQL connection URL format', 400);
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
function parsePostgreSQLUrl(url) {
    // Format: postgresql://user:password@host:port/database?params
    const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):?(\d+)?\/(.+)$/);
    if (!match) {
        throw (0, error_util_1.createError)('INVALID_POSTGRESQL_URL', 'Invalid PostgreSQL connection URL format', 400);
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
async function backupMySQL(password, customPath) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw (0, error_util_1.createError)('DATABASE_URL_NOT_SET', 'DATABASE_URL environment variable is not set', 400);
    }
    const conn = parseMySQLUrl(databaseUrl);
    // Use custom path if provided, otherwise use default location
    let backupPath;
    if (customPath) {
        backupPath = customPath;
        // Ensure the directory exists
        const backupDir = path_1.default.dirname(backupPath);
        try {
            await promises_1.default.access(backupDir);
        }
        catch {
            await promises_1.default.mkdir(backupDir, { recursive: true });
        }
    }
    else {
        // Create backup directory
        const backupDir = path_1.default.join(process.cwd(), 'backups');
        try {
            await promises_1.default.access(backupDir);
        }
        catch {
            await promises_1.default.mkdir(backupDir, { recursive: true });
        }
        // Create backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
            new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const fileExtension = password ? '.encrypted.omw' : '.omw';
        const backupFileName = `mysql_backup_${timestamp}${fileExtension}`;
        backupPath = path_1.default.join(backupDir, backupFileName);
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
        await promises_1.default.writeFile(backupPath, backupData);
        // Get file size
        const stats = await promises_1.default.stat(backupPath);
        const sizeInMB = stats.size / (1024 * 1024);
        return {
            path: backupPath,
            size: Math.round(sizeInMB * 100) / 100,
            encrypted: !!password,
        };
    }
    catch (error) {
        if (error.message?.includes('mysqldump')) {
            throw (0, error_util_1.createError)('MYSQLDUMP_NOT_FOUND', 'mysqldump command not found. Please ensure MySQL client tools are installed.', 500);
        }
        throw (0, error_util_1.createError)('MYSQL_BACKUP_FAILED', `Failed to create MySQL backup: ${error.message}`, 500);
    }
}
/**
 * Create PostgreSQL backup using pg_dump
 */
async function backupPostgreSQL(password, customPath) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw (0, error_util_1.createError)('DATABASE_URL_NOT_SET', 'DATABASE_URL environment variable is not set', 400);
    }
    const conn = parsePostgreSQLUrl(databaseUrl);
    // Use custom path if provided, otherwise use default location
    let backupPath;
    if (customPath) {
        backupPath = customPath;
        // Ensure the directory exists
        const backupDir = path_1.default.dirname(backupPath);
        try {
            await promises_1.default.access(backupDir);
        }
        catch {
            await promises_1.default.mkdir(backupDir, { recursive: true });
        }
    }
    else {
        // Create backup directory
        const backupDir = path_1.default.join(process.cwd(), 'backups');
        try {
            await promises_1.default.access(backupDir);
        }
        catch {
            await promises_1.default.mkdir(backupDir, { recursive: true });
        }
        // Create backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
            new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const fileExtension = password ? '.encrypted.omw' : '.omw';
        const backupFileName = `postgresql_backup_${timestamp}${fileExtension}`;
        backupPath = path_1.default.join(backupDir, backupFileName);
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
        await promises_1.default.writeFile(backupPath, backupData);
        // Get file size
        const stats = await promises_1.default.stat(backupPath);
        const sizeInMB = stats.size / (1024 * 1024);
        return {
            path: backupPath,
            size: Math.round(sizeInMB * 100) / 100,
            encrypted: !!password,
        };
    }
    catch (error) {
        if (error.message?.includes('pg_dump')) {
            throw (0, error_util_1.createError)('PG_DUMP_NOT_FOUND', 'pg_dump command not found. Please ensure PostgreSQL client tools are installed.', 500);
        }
        throw (0, error_util_1.createError)('POSTGRESQL_BACKUP_FAILED', `Failed to create PostgreSQL backup: ${error.message}`, 500);
    }
}
/**
 * Get the database file path from DATABASE_URL (SQLite only)
 */
function getDatabasePath() {
    const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/database.db';
    // Extract path from SQLite connection string (file:./path/to/db.db)
    if (databaseUrl.startsWith('file:')) {
        let filePath = databaseUrl.replace(/^file:/, '').trim();
        // Remove query parameters if any
        if (filePath.includes('?')) {
            filePath = filePath.split('?')[0];
        }
        // Handle absolute paths
        if (path_1.default.isAbsolute(filePath)) {
            return filePath;
        }
        // Resolve relative paths from current working directory
        const directPath = path_1.default.resolve(process.cwd(), filePath);
        // Return the path (we'll check existence later)
        return directPath;
    }
    // Default path - try multiple common locations
    const defaultPaths = [
        path_1.default.resolve(process.cwd(), 'prisma', 'database.db'),
        path_1.default.resolve(process.cwd(), 'backend', 'prisma', 'database.db'),
        path_1.default.resolve(process.cwd(), 'database.db'),
    ];
    // Return first default path (existence will be checked in backupDatabase)
    return defaultPaths[0];
}
/**
 * Find the actual database file path (checks multiple locations)
 */
async function findDatabaseFile() {
    const primaryPath = getDatabasePath();
    // Check primary path first
    try {
        await promises_1.default.access(primaryPath);
        return primaryPath;
    }
    catch {
        // Try alternative locations
        const alternativePaths = [
            path_1.default.resolve(process.cwd(), 'backend', 'prisma', 'database.db'),
            path_1.default.resolve(process.cwd(), 'prisma', 'database.db'),
            path_1.default.resolve(process.cwd(), 'database.db'),
            path_1.default.resolve(__dirname, '..', '..', 'prisma', 'database.db'),
            path_1.default.resolve(__dirname, '..', 'prisma', 'database.db'),
        ];
        for (const altPath of alternativePaths) {
            try {
                await promises_1.default.access(altPath);
                return altPath;
            }
            catch {
                // Continue searching
            }
        }
        // If not found, throw error with helpful message
        const searchedPaths = [primaryPath, ...alternativePaths].join('\n- ');
        throw (0, error_util_1.createError)('DATABASE_NOT_FOUND', `Database file not found. Searched in:\n- ${searchedPaths}\n\nPlease ensure the database file exists or set DATABASE_URL environment variable correctly. Current DATABASE_URL: ${process.env.DATABASE_URL || 'not set'}`, 404);
    }
}
/**
 * Create a backup of the database
 * @param password Optional password to encrypt the backup
 * @param customPath Optional custom file path where to save the backup
 */
async function backupDatabase(password, customPath) {
    try {
        const provider = getDatabaseProvider();
        // Route to appropriate backup function based on database provider
        if (provider === 'mysql') {
            return await backupMySQL(password, customPath);
        }
        else if (provider === 'postgresql') {
            return await backupPostgreSQL(password, customPath);
        }
        else {
            // SQLite backup (existing implementation)
            // Find the database file first (we need it to read the data and optionally determine backup path)
            const dbPath = await findDatabaseFile();
            // Use custom path if provided, otherwise use default location
            let backupPath;
            if (customPath) {
                backupPath = customPath;
                // Ensure the directory exists
                const backupDir = path_1.default.dirname(backupPath);
                try {
                    await promises_1.default.access(backupDir);
                }
                catch {
                    await promises_1.default.mkdir(backupDir, { recursive: true });
                }
            }
            else {
                // Create backup filename with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                    new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
                const dbName = path_1.default.basename(dbPath, path_1.default.extname(dbPath));
                const backupDir = path_1.default.join(path_1.default.dirname(dbPath), 'backups');
                const fileExtension = password ? '.encrypted.omw' : '.omw';
                const backupFileName = `${dbName}_backup_${timestamp}${fileExtension}`;
                backupPath = path_1.default.join(backupDir, backupFileName);
                // Create backups directory if it doesn't exist
                try {
                    await promises_1.default.access(backupDir);
                }
                catch {
                    await promises_1.default.mkdir(backupDir, { recursive: true });
                }
            }
            // Read database file
            const dbData = await promises_1.default.readFile(dbPath);
            // Encrypt if password provided
            const backupData = password ? encryptData(dbData, password) : dbData;
            // Write backup file to the chosen location
            await promises_1.default.writeFile(backupPath, backupData);
            // Get file size
            const stats = await promises_1.default.stat(backupPath);
            const sizeInMB = stats.size / (1024 * 1024);
            return {
                path: backupPath,
                size: Math.round(sizeInMB * 100) / 100, // Round to 2 decimal places
                encrypted: !!password,
            };
        }
    }
    catch (error) {
        // If it's already an ApiError, rethrow it
        if (error instanceof Error && 'code' in error) {
            throw error;
        }
        throw (0, error_util_1.createError)('BACKUP_FAILED', `Failed to create database backup: ${error.message}`, 500);
    }
}
/**
 * Restore MySQL database from SQL dump
 */
async function restoreMySQL(backupFilePath, password) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw (0, error_util_1.createError)('DATABASE_URL_NOT_SET', 'DATABASE_URL environment variable is not set', 400);
    }
    const conn = parseMySQLUrl(databaseUrl);
    // Read and decrypt backup file if needed
    let sqlData;
    try {
        const fileBuffer = await promises_1.default.readFile(backupFilePath);
        // Check if encrypted
        const encrypted = isEncrypted(fileBuffer);
        if (encrypted && !password) {
            throw (0, error_util_1.createError)('PASSWORD_REQUIRED', 'This backup file is encrypted. Password is required.', 400);
        }
        // Decrypt if needed
        if (encrypted) {
            sqlData = decryptData(fileBuffer, password);
        }
        else {
            sqlData = fileBuffer;
        }
    }
    catch (error) {
        if (error.code === 'PASSWORD_REQUIRED' || error.code === 'DECRYPTION_FAILED' || error.code === 'INVALID_ENCRYPTED_FILE') {
            throw error;
        }
        throw (0, error_util_1.createError)('BACKUP_NOT_FOUND', 'Backup file not found or cannot be read', 404);
    }
    // Disconnect Prisma
    await (0, database_1.disconnectDatabase)();
    // Write SQL to temporary file and restore from it (use .sql extension for MySQL command compatibility)
    const tempFile = path_1.default.join(os_1.default.tmpdir(), `mysql_restore_${Date.now()}.sql`);
    try {
        await promises_1.default.writeFile(tempFile, sqlData);
        // Execute mysql restore from file
        const envVars = { ...process.env, MYSQL_PWD: conn.password };
        const command = `mysql -h ${conn.host} -P ${conn.port} -u ${conn.user} ${conn.database} < ${tempFile}`;
        // Use shell command to handle input redirection
        await execAsync(command, {
            env: envVars,
            maxBuffer: 50 * 1024 * 1024,
            shell: os_1.default.platform() === 'win32' ? 'cmd.exe' : '/bin/bash',
        });
    }
    catch (error) {
        if (error.message?.includes('mysql')) {
            throw (0, error_util_1.createError)('MYSQL_NOT_FOUND', 'mysql command not found. Please ensure MySQL client tools are installed.', 500);
        }
        throw (0, error_util_1.createError)('MYSQL_RESTORE_FAILED', `Failed to restore MySQL database: ${error.message}`, 500);
    }
    finally {
        // Clean up temp file
        try {
            await promises_1.default.unlink(tempFile);
        }
        catch {
            // Ignore cleanup errors
        }
    }
}
/**
 * Restore PostgreSQL database from SQL dump
 */
async function restorePostgreSQL(backupFilePath, password) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw (0, error_util_1.createError)('DATABASE_URL_NOT_SET', 'DATABASE_URL environment variable is not set', 400);
    }
    const conn = parsePostgreSQLUrl(databaseUrl);
    // Read and decrypt backup file if needed
    let sqlData;
    try {
        const fileBuffer = await promises_1.default.readFile(backupFilePath);
        // Check if encrypted
        const encrypted = isEncrypted(fileBuffer);
        if (encrypted && !password) {
            throw (0, error_util_1.createError)('PASSWORD_REQUIRED', 'This backup file is encrypted. Password is required.', 400);
        }
        // Decrypt if needed
        if (encrypted) {
            sqlData = decryptData(fileBuffer, password);
        }
        else {
            sqlData = fileBuffer;
        }
    }
    catch (error) {
        if (error.code === 'PASSWORD_REQUIRED' || error.code === 'DECRYPTION_FAILED' || error.code === 'INVALID_ENCRYPTED_FILE') {
            throw error;
        }
        throw (0, error_util_1.createError)('BACKUP_NOT_FOUND', 'Backup file not found or cannot be read', 404);
    }
    // Disconnect Prisma
    await (0, database_1.disconnectDatabase)();
    // Write SQL to temporary file and restore from it (use .sql extension for PostgreSQL command compatibility)
    const tempFile = path_1.default.join(os_1.default.tmpdir(), `postgresql_restore_${Date.now()}.sql`);
    try {
        await promises_1.default.writeFile(tempFile, sqlData);
        // Execute psql restore from file
        const pgPasswordEnv = { ...process.env, PGPASSWORD: conn.password };
        const command = `psql -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} -f ${tempFile}`;
        await execAsync(command, {
            env: pgPasswordEnv,
            maxBuffer: 50 * 1024 * 1024,
            shell: os_1.default.platform() === 'win32' ? 'cmd.exe' : '/bin/bash',
        });
    }
    catch (error) {
        if (error.message?.includes('psql')) {
            throw (0, error_util_1.createError)('PSQL_NOT_FOUND', 'psql command not found. Please ensure PostgreSQL client tools are installed.', 500);
        }
        throw (0, error_util_1.createError)('POSTGRESQL_RESTORE_FAILED', `Failed to restore PostgreSQL database: ${error.message}`, 500);
    }
    finally {
        // Clean up temp file
        try {
            await promises_1.default.unlink(tempFile);
        }
        catch {
            // Ignore cleanup errors
        }
    }
}
/**
 * Restore database from a backup file
 * @param backupFilePath Path to the backup file
 * @param password Optional password if the backup is encrypted
 */
async function restoreDatabase(backupFilePath, password) {
    try {
        // Validate backup file exists
        try {
            await promises_1.default.access(backupFilePath);
        }
        catch {
            throw (0, error_util_1.createError)('BACKUP_NOT_FOUND', 'Backup file not found', 404);
        }
        const provider = getDatabaseProvider();
        // Route to appropriate restore function based on database provider
        if (provider === 'mysql') {
            return await restoreMySQL(backupFilePath, password);
        }
        else if (provider === 'postgresql') {
            return await restorePostgreSQL(backupFilePath, password);
        }
        else {
            // SQLite restore (existing implementation)
            // Read backup file
            const fileBuffer = await promises_1.default.readFile(backupFilePath);
            // Check if file is encrypted
            const encrypted = isEncrypted(fileBuffer);
            // If encrypted, require password
            if (encrypted && !password) {
                throw (0, error_util_1.createError)('PASSWORD_REQUIRED', 'This backup file is encrypted. Password is required.', 400);
            }
            // Decrypt if encrypted
            let dbData;
            if (encrypted) {
                try {
                    dbData = decryptData(fileBuffer, password);
                }
                catch (error) {
                    if (error.code === 'DECRYPTION_FAILED' || error.code === 'INVALID_ENCRYPTED_FILE') {
                        throw error;
                    }
                    throw (0, error_util_1.createError)('DECRYPTION_FAILED', 'Failed to decrypt backup file. Incorrect password?', 400);
                }
            }
            else {
                dbData = fileBuffer;
            }
            // Validate it's a valid SQLite file (check file header)
            const sqliteHeader = dbData.toString('utf-8', 0, 16);
            if (!sqliteHeader.startsWith('SQLite format 3')) {
                throw (0, error_util_1.createError)('INVALID_BACKUP', 'File is not a valid SQLite database', 400);
            }
            // Get the database path (try to find existing, otherwise use default)
            let dbPath;
            try {
                dbPath = await findDatabaseFile();
            }
            catch {
                // Database doesn't exist yet, use default path from getDatabasePath()
                dbPath = getDatabasePath();
                // Ensure directory exists
                const dbDir = path_1.default.dirname(dbPath);
                try {
                    await promises_1.default.access(dbDir);
                }
                catch {
                    await promises_1.default.mkdir(dbDir, { recursive: true });
                }
            }
            // Disconnect Prisma to ensure no locks on database
            await (0, database_1.disconnectDatabase)();
            // Create a backup of current database before restoring (safety measure)
            try {
                await promises_1.default.access(dbPath);
                const safetyBackupPath = `${dbPath}.pre_restore_${Date.now()}`;
                await promises_1.default.copyFile(dbPath, safetyBackupPath);
            }
            catch {
                // Current database doesn't exist, that's ok - we'll create it from the backup
            }
            // Write decrypted/unencrypted data to database location
            await promises_1.default.writeFile(dbPath, dbData);
            // Note: Prisma client will be recreated on next use automatically
        }
    }
    catch (error) {
        if (error.code === 'BACKUP_NOT_FOUND' || error.code === 'INVALID_BACKUP' ||
            error.code === 'PASSWORD_REQUIRED' || error.code === 'DECRYPTION_FAILED' ||
            error.code === 'INVALID_ENCRYPTED_FILE') {
            throw error;
        }
        throw (0, error_util_1.createError)('RESTORE_FAILED', `Failed to restore database: ${error.message}`, 500);
    }
}
/**
 * Get list of available backups
 */
/**
 * Check if a backup file is encrypted
 */
async function checkBackupEncryption(backupFilePath) {
    try {
        await promises_1.default.access(backupFilePath);
        const headerBuffer = Buffer.from(ENCRYPTED_HEADER, 'utf-8');
        const fileBuffer = await promises_1.default.readFile(backupFilePath);
        // Only check the first bytes
        const headerSlice = fileBuffer.slice(0, headerBuffer.length);
        return { encrypted: isEncrypted(headerSlice) };
    }
    catch (error) {
        throw (0, error_util_1.createError)('CHECK_ENCRYPTION_FAILED', `Failed to check backup encryption: ${error.message}`, 500);
    }
}
/**
 * Get list of available backups
 */
async function listBackups() {
    try {
        const provider = getDatabaseProvider();
        // Determine backup directory based on provider
        let backupDir;
        if (provider === 'sqlite') {
            // Find database file to determine backup directory location
            const dbPath = await findDatabaseFile().catch(() => getDatabasePath());
            backupDir = path_1.default.join(path_1.default.dirname(dbPath), 'backups');
        }
        else {
            // For MySQL/PostgreSQL, use a common backups directory
            backupDir = path_1.default.join(process.cwd(), 'backups');
        }
        // Check if backups directory exists
        try {
            await promises_1.default.access(backupDir);
        }
        catch {
            return []; // No backups directory means no backups
        }
        // Read all files in backups directory
        const files = await promises_1.default.readdir(backupDir);
        const backups = [];
        for (const file of files) {
            // Include .omw and .encrypted.omw files (also support legacy .db and .sql files for backward compatibility)
            if (file.endsWith('.omw') || file.endsWith('.encrypted.omw') ||
                file.endsWith('.db') || file.endsWith('.encrypted.db') ||
                file.endsWith('.sql') || file.endsWith('.encrypted.sql')) {
                const filePath = path_1.default.join(backupDir, file);
                const stats = await promises_1.default.stat(filePath);
                // Check if encrypted by reading first bytes
                let isEncryptedBackup = false;
                try {
                    const headerBuffer = Buffer.from(ENCRYPTED_HEADER, 'utf-8');
                    const fileBuffer = await promises_1.default.readFile(filePath);
                    // Only check the first bytes
                    const headerSlice = fileBuffer.slice(0, headerBuffer.length);
                    isEncryptedBackup = isEncrypted(headerSlice);
                }
                catch {
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
    }
    catch (error) {
        throw (0, error_util_1.createError)('LIST_BACKUPS_FAILED', `Failed to list backups: ${error.message}`, 500);
    }
}
//# sourceMappingURL=backup.service.js.map