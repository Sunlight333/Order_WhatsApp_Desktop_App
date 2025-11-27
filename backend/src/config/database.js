"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrismaClient = getPrismaClient;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
let prisma;
function getPrismaClient() {
    if (!prisma) {
        // Use default if DATABASE_URL is not set (for development)
        const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/database.db';
        prisma = new client_1.PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
        // SQLite-specific optimizations
        if (process.env.DATABASE_PROVIDER === 'sqlite') {
            prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
            prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
            prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
        }
    }
    return prisma;
}
async function disconnectDatabase() {
    if (prisma) {
        await prisma.$disconnect();
    }
}
//# sourceMappingURL=database.js.map