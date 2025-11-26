import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // Use default if DATABASE_URL is not set (for development)
    const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/database.db';

    prisma = new PrismaClient({
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

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

