"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDatabaseConnection = testDatabaseConnection;
const client_1 = require("@prisma/client");
/**
 * Test database connection with given configuration
 */
async function testDatabaseConnection(config) {
    let testPrisma = null;
    try {
        // Determine connection URL
        let connectionUrl;
        if (config.type === 'sqlite') {
            if (!config.path && !config.url) {
                return {
                    success: false,
                    message: 'SQLite database path is required',
                    error: 'MISSING_PATH',
                };
            }
            // Handle both 'file:./path' and './path' formats
            const path = config.path || config.url?.replace(/^file:/, '') || '';
            connectionUrl = path.startsWith('file:') ? path : `file:${path}`;
        }
        else {
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
        testPrisma = new client_1.PrismaClient({
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
                await testPrisma.$queryRaw `SELECT 1`;
            }
            catch (error) {
                return {
                    success: false,
                    message: `Database file is not accessible: ${error.message}`,
                    error: error.code || 'FILE_ERROR',
                };
            }
        }
        else {
            // For MySQL/PostgreSQL, test with a simple query
            try {
                await testPrisma.$queryRaw `SELECT 1`;
            }
            catch (error) {
                return {
                    success: false,
                    message: `Connection failed: ${error.message}`,
                    error: error.code || 'CONNECTION_ERROR',
                };
            }
        }
        return {
            success: true,
            message: `Successfully connected to ${config.type.toUpperCase()} database`,
        };
    }
    catch (error) {
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
    }
    finally {
        // Clean up the test connection
        if (testPrisma) {
            try {
                await testPrisma.$disconnect();
            }
            catch (error) {
                // Ignore disconnect errors
            }
        }
    }
}
//# sourceMappingURL=database.service.js.map