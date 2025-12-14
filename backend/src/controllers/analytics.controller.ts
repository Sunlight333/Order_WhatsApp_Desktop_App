import { Request, Response } from 'express';
import {
  getTopProducts,
  getTopCustomers,
  getOrderStatistics,
  getSupplierMonthlyData,
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

/**
 * GET /api/v1/analytics/supplier-monthly
 * Get supplier monthly assessment data
 */
export async function getSupplierMonthlyController(req: Request, res: Response): Promise<void> {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const supplierId = req.query.supplierId as string | undefined;
    const data = await getSupplierMonthlyData(year, month, supplierId);
    res.status(200).json(createSuccessResponse(data));
  } catch (error) {
    throw error;
  }
}

