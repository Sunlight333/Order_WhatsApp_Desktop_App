import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

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

