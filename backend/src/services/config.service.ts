import { getPrismaClient } from '../config/database';

const prisma = getPrismaClient();

/**
 * Default configuration values
 */
const DEFAULT_CONFIGS: Record<string, string> = {
  whatsapp_default_message: 'Hola, tu pedido está listo para recoger.',
};

/**
 * Get configuration value by key
 * Auto-creates default configs if they don't exist
 */
export async function getConfigValue(key: string) {
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
export async function updateConfigValue(key: string, value: string) {
  const config = await prisma.config.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  return config;
}
