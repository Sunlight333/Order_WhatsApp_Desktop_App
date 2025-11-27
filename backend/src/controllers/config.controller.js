"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigController = getConfigController;
exports.updateConfigController = updateConfigController;
const config_service_1 = require("../services/config.service");
const response_util_1 = require("../utils/response.util");
const error_util_1 = require("../utils/error.util");
/**
 * GET /api/v1/config/:key
 * Get configuration value
 */
async function getConfigController(req, res) {
    try {
        const { key } = req.params;
        const config = await (0, config_service_1.getConfigValue)(key);
        if (!config) {
            throw (0, error_util_1.createError)('CONFIG_NOT_FOUND', 'Configuration not found', 404);
        }
        res.status(200).json((0, response_util_1.createSuccessResponse)(config));
    }
    catch (error) {
        throw error;
    }
}
/**
 * PUT /api/v1/config/:key
 * Update configuration value
 */
async function updateConfigController(req, res) {
    try {
        const { key } = req.params;
        const { value } = req.body;
        if (typeof value !== 'string') {
            throw (0, error_util_1.createError)('INVALID_VALUE', 'Configuration value must be a string', 400);
        }
        const config = await (0, config_service_1.updateConfigValue)(key, value);
        res.status(200).json((0, response_util_1.createSuccessResponse)(config, 'Configuration updated successfully'));
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=config.controller.js.map