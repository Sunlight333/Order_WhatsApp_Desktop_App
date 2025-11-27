import { Request, Response } from 'express';
/**
 * GET /api/v1/config/:key
 * Get configuration value
 */
export declare function getConfigController(req: Request, res: Response): Promise<void>;
/**
 * PUT /api/v1/config/:key
 * Update configuration value
 */
export declare function updateConfigController(req: Request, res: Response): Promise<void>;
