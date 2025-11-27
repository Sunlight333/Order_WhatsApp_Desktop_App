"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDatabaseController = testDatabaseController;
const database_service_1 = require("../services/database.service");
const response_util_1 = require("../utils/response.util");
const error_util_1 = require("../utils/error.util");
/**
 * Test database connection
 * POST /api/v1/database/test
 * Body: { type: 'sqlite' | 'mysql' | 'postgresql', url?: string, path?: string }
 */
async function testDatabaseController(req, res) {
    try {
        const { type, url, path } = req.body;
        if (!type) {
            res.status(400).json((0, error_util_1.createErrorResponse)('BAD_REQUEST', 'Database type is required'));
            return;
        }
        if (type !== 'sqlite' && type !== 'mysql' && type !== 'postgresql') {
            res.status(400).json((0, error_util_1.createErrorResponse)('BAD_REQUEST', 'Invalid database type. Must be sqlite, mysql, or postgresql'));
            return;
        }
        const config = {
            type,
            url,
            path,
        };
        const result = await (0, database_service_1.testDatabaseConnection)(config);
        if (result.success) {
            res.status(200).json((0, response_util_1.createSuccessResponse)({ message: result.message }, result.message));
        }
        else {
            res.status(400).json((0, error_util_1.createErrorResponse)(result.error || 'DATABASE_CONNECTION_FAILED', result.message));
        }
    }
    catch (error) {
        res.status(500).json((0, error_util_1.createErrorResponse)('INTERNAL_ERROR', error.message || 'Failed to test database connection'));
    }
}
//# sourceMappingURL=database.controller.js.map