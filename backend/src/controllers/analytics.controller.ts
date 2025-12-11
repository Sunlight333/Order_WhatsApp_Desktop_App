import { Request, Response } from 'express';
import {
  getTopProducts,
  getTopCustomers,
  getOrderStatistics,
} from '../services/analytics.service';
import { createSuccessResponse } from '../utils/response.util';

/**
 * GET /api/v1/analytics/top-products
 * Get top products (most requested references)
 */
export async function getTopProductsController(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const products = await getTopProducts(limit);
    res.status(200).json(createSuccessResponse(products));
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/v1/analytics/top-customers
 * Get top customers (customers who order the most)
 */
export async function getTopCustomersController(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const customers = await getTopCustomers(limit);
    res.status(200).json(createSuccessResponse(customers));
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/v1/analytics/order-statistics
 * Get order statistics
 */
export async function getOrderStatisticsController(req: Request, res: Response): Promise<void> {
  try {
    const statistics = await getOrderStatistics();
    res.status(200).json(createSuccessResponse(statistics));
  } catch (error) {
    throw error;
  }
}

