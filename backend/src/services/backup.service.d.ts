/**
 * Create a backup of the database
 * @param password Optional password to encrypt the backup
 * @param customPath Optional custom file path where to save the backup
 */
export declare function backupDatabase(password?: string, customPath?: string): Promise<{
    path: string;
    size: number;
    encrypted: boolean;
}>;
/**
 * Restore database from a backup file
 * @param backupFilePath Path to the backup file
 * @param password Optional password if the backup is encrypted
 */
export declare function restoreDatabase(backupFilePath: string, password?: string): Promise<void>;
/**
 * Get list of available backups
 */
/**
 * Check if a backup file is encrypted
 */
export declare function checkBackupEncryption(backupFilePath: string): Promise<{
    encrypted: boolean;
}>;
/**
 * Get list of available backups
 */
export declare function listBackups(): Promise<Array<{
    filename: string;
    path: string;
    size: number;
    createdAt: Date;
    encrypted: boolean;
}>>;
