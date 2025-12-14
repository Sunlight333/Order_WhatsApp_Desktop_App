import { Request, Response } from 'express';
import { getConfigValue, updateConfigValue, getOrderStatusConfig, updateOrderStatusConfig, OrderStatusesConfig } from '../services/config.service';
import { createSuccessResponse } from '../utils/response.util';
import { createError } from '../utils/error.util';

/**
 * GET /api/v1/config/:key
 * Get configuration value
 */
export async function getConfigController(req: Request, res: Response): Promise<void> {
  try {
    const { key } = req.params;
    const config = await getConfigValue(key);

    if (!config) {
      throw createError('CONFIG_NOT_FOUND', 'Configuration not found', 404);
    }

    res.status(200).json(createSuccessResponse(config));
  } catch (error) {
    throw error;
  }
}

/**
 * PUT /api/v1/config/:key
 * Update configuration value
 */
export async function updateConfigController(req: Request, res: Response): Promise<void> {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (typeof value !== 'string') {
      throw createError('INVALID_VALUE', 'Configuration value must be a string', 400);
    }

    const config = await updateConfigValue(key, value);

    res.status(200).json(createSuccessResponse(config, 'Configuration updated successfully'));
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/v1/config/order-statuses
 * Get order status configuration
 */
export async function getOrderStatusConfigController(req: Request, res: Response): Promise<void> {
  try {
    const config = await getOrderStatusConfig();
    res.status(200).json(createSuccessResponse(config));
  } catch (error) {
    throw error;
  }
}

/**
 * PUT /api/v1/config/order-statuses
 * Update order status configuration
 */
export async function updateOrderStatusConfigController(req: Request, res: Response): Promise<void> {
  try {
    const config = req.body as OrderStatusesConfig;
    
    if (!config || typeof config !== 'object') {
      throw createError('INVALID_CONFIG', 'Configuration must be an object', 400);
    }

    const updatedConfig = await updateOrderStatusConfig(config);
    res.status(200).json(createSuccessResponse(updatedConfig, 'Order status configuration updated successfully'));
  } catch (error) {
    throw error;
  }
}
