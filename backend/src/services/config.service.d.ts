/**
 * Get configuration value by key
 * Auto-creates default configs if they don't exist
 */
export declare function getConfigValue(key: string): Promise<{
    value: string | null;
    id: string;
    updatedAt: Date;
    key: string;
} | null>;
/**
 * Update configuration value
 */
export declare function updateConfigValue(key: string, value: string): Promise<{
    value: string | null;
    id: string;
    updatedAt: Date;
    key: string;
}>;
