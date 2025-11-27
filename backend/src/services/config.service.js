"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigValue = getConfigValue;
exports.updateConfigValue = updateConfigValue;
const database_1 = require("../config/database");
const prisma = (0, database_1.getPrismaClient)();
/**
 * Default configuration values
 */
const DEFAULT_CONFIGS = {
    whatsapp_default_message: 'Hola, tu pedido está listo para recoger.',
};
/**
 * Get configuration value by key
 * Auto-creates default configs if they don't exist
 */
async function getConfigValue(key) {
    let config = await prisma.config.findUnique({
        where: { key },
    });
    // If config doesn't exist and we have a default, create it
    if (!config && DEFAULT_CONFIGS[key]) {
        config = await prisma.config.create({
            data: {
                key,
                value: DEFAULT_CONFIGS[key],
            },
        });
    }
    return config;
}
/**
 * Update configuration value
 */
async function updateConfigValue(key, value) {
    const config = await prisma.config.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
    return config;
}
//# sourceMappingURL=config.service.js.map