import { getPrismaClient } from '../config/database';

const prisma = getPrismaClient();

/**
 * Get configuration value by key
 */
export async function getConfigValue(key: string) {
  const config = await prisma.config.findUnique({
    where: { key },
  });

  return config;
}

/**
 * Update configuration value
 */
export async function updateConfigValue(key: string, value: string) {
  const config = await prisma.config.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  return config;
}
