import { getPrismaClient } from '../config/database';
import { createError } from '../utils/error.util';

const prisma = getPrismaClient();

/**
 * Default configuration values
 */
const DEFAULT_CONFIGS: Record<string, string> = {
  whatsapp_default_message: 'Hola, tu pedido está listo para recoger.',
  users_see_only_own_orders: 'false', // Default: users can see all orders
  // Per-user override for order visibility. JSON map: { [userId]: "OWN" | "ALL" }
  users_orders_visibility_overrides: '{}',
  // Feature flag: enable/disable per-user overrides enforcement
  users_orders_visibility_overrides_enabled: 'false',
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

/**
 * Order status configuration interface
 */
export interface OrderStatusConfig {
  color: string; // Hex color code
  backgroundColor?: string; // Hex color code for background
  fontFamily?: string; // Font family
  fontSize?: string; // Font size (e.g., "14px", "1rem")
  fontWeight?: string; // Font weight (e.g., "normal", "bold", "600")
  text: string; // Display text for the status
}

export interface OrderStatusesConfig {
  [status: string]: OrderStatusConfig;
}

/**
 * Default order status configurations
 */
const DEFAULT_ORDER_STATUSES: OrderStatusesConfig = {
  PENDING: {
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    // Creating an order sets status = PENDING (meaning: pending to receive merchandise)
    text: 'Pendiente de Recibir',
  },
  RECEIVED: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Pendiente de avisar',
  },
  NOTIFIED_CALL: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Avisado (Llamada)',
  },
  NOTIFIED_WHATSAPP: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Avisado (WhatsApp)',
  },
  CANCELLED: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Cancelado',
  },
  INCOMPLETO: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Incompleto',
  },
  DELIVERED_COUNTER: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Entregado en Mostrador',
  },
  READY_TO_SEND: {
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Preparado para enviar',
  },
  SENT: {
    color: '#10b981',
    backgroundColor: '#d1fae5',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'normal',
    text: 'Enviado',
  },
};

/**
 * Get order status configuration
 */
export async function getOrderStatusConfig(): Promise<OrderStatusesConfig> {
  const config = await getConfigValue('order_statuses_config');
  
  if (!config || !config.value) {
    // Return defaults and save them
    await updateConfigValue('order_statuses_config', JSON.stringify(DEFAULT_ORDER_STATUSES));
    return DEFAULT_ORDER_STATUSES;
  }

  try {
    const parsed = JSON.parse(config.value) as OrderStatusesConfig;
    // Merge with defaults to ensure all statuses are present
    const merged = { ...DEFAULT_ORDER_STATUSES, ...parsed };

    // Backward-compat: older installs may have PENDING mislabeled (e.g. "Pendiente", "Pendiente de avisar",
    // different casing, or extra spaces). Since order creation always uses status=PENDING, its label must mean
    // "pending receipt".
    const pendingText = String(merged?.PENDING?.text ?? '').trim();
    const pendingTextLower = pendingText.toLowerCase();
    const shouldUpgradePending =
      pendingTextLower === 'pendiente' ||
      pendingTextLower === 'pendiente de avisar' ||
      pendingTextLower.includes('avisar') ||
      pendingTextLower.includes('notificar');

    if (pendingText && shouldUpgradePending && pendingText !== DEFAULT_ORDER_STATUSES.PENDING.text) {
      merged.PENDING = { ...merged.PENDING, text: DEFAULT_ORDER_STATUSES.PENDING.text };
      await updateConfigValue('order_statuses_config', JSON.stringify(merged));
    }

    // Auto-upgrade: Ensure READY_TO_SEND status exists in stored config
    // This handles cases where the config was created before READY_TO_SEND was added
    // Only update if the status doesn't exist at all, or if it's missing required fields
    if (!merged.READY_TO_SEND) {
      merged.READY_TO_SEND = DEFAULT_ORDER_STATUSES.READY_TO_SEND;
      await updateConfigValue('order_statuses_config', JSON.stringify(merged));
    } else if (!merged.READY_TO_SEND.text || merged.READY_TO_SEND.text === '') {
      // Only update text if it's missing, preserve colors and other customizations
      merged.READY_TO_SEND = {
        ...merged.READY_TO_SEND,
        text: DEFAULT_ORDER_STATUSES.READY_TO_SEND.text,
      };
      await updateConfigValue('order_statuses_config', JSON.stringify(merged));
    }

    // Auto-upgrade: Ensure SENT status exists in stored config
    // This handles cases where the config was created before SENT was added
    if (!merged.SENT) {
      merged.SENT = DEFAULT_ORDER_STATUSES.SENT;
      await updateConfigValue('order_statuses_config', JSON.stringify(merged));
    } else if (!merged.SENT.text || merged.SENT.text === '') {
      merged.SENT = {
        ...merged.SENT,
        text: DEFAULT_ORDER_STATUSES.SENT.text,
      };
      await updateConfigValue('order_statuses_config', JSON.stringify(merged));
    }

    return merged;
  } catch (error) {
    console.error('Failed to parse order status config:', error);
    return DEFAULT_ORDER_STATUSES;
  }
}

/**
 * Update order status configuration
 */
export async function updateOrderStatusConfig(config: OrderStatusesConfig): Promise<OrderStatusesConfig> {
  // Validate that all required statuses are present
  const validStatuses = ['PENDING', 'RECEIVED', 'NOTIFIED_CALL', 'NOTIFIED_WHATSAPP', 'CANCELLED', 'INCOMPLETO', 'DELIVERED_COUNTER', 'READY_TO_SEND', 'SENT'];
  
  // Load current configuration to preserve existing customizations
  const currentConfig = await getOrderStatusConfig();
  const mergedConfig: OrderStatusesConfig = { ...currentConfig };

  // Only update statuses that are valid and provided in the update
  for (const status of validStatuses) {
    if (config[status]) {
      // Merge with defaults first to ensure all required fields are present,
      // then apply the user's customizations
      mergedConfig[status] = {
        ...DEFAULT_ORDER_STATUSES[status],
        ...currentConfig[status], // Preserve existing customizations
        ...config[status], // Apply new updates
      };
    }
  }

  await updateConfigValue('order_statuses_config', JSON.stringify(mergedConfig));
  return mergedConfig;
}

/**
 * Get order counter configuration
 */
export async function getOrderCounterConfig() {
  const counterConfig = await getConfigValue('orderCounter');
  const prefixConfig = await getConfigValue('orderPrefix');
  
  return {
    counter: counterConfig?.value ? parseInt(counterConfig.value, 10) || 0 : 0,
    prefix: prefixConfig?.value || '',
  };
}

/**
 * Reset order counter to 0
 */
export async function resetOrderCounter() {
  await updateConfigValue('orderCounter', '0');
  return { counter: 0 };
}

/**
 * Set order prefix
 */
export async function setOrderPrefix(prefix: string) {
  // Validate prefix: should be numeric and not empty
  if (prefix && !/^\d+$/.test(prefix)) {
    throw createError('INVALID_PREFIX', 'Order prefix must be numeric', 400);
  }
  
  await updateConfigValue('orderPrefix', prefix || '');
  return { prefix: prefix || '' };
}