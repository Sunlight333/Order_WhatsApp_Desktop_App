export interface DatabaseTestConfig {
    type: 'sqlite' | 'mysql' | 'postgresql';
    url?: string;
    path?: string;
}
export interface DatabaseTestResult {
    success: boolean;
    message: string;
    error?: string;
}
/**
 * Test database connection with given configuration
 */
export declare function testDatabaseConnection(config: DatabaseTestConfig): Promise<DatabaseTestResult>;
