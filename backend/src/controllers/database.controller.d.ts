import { Request, Response } from 'express';
/**
 * Test database connection
 * POST /api/v1/database/test
 * Body: { type: 'sqlite' | 'mysql' | 'postgresql', url?: string, path?: string }
 */
export declare function testDatabaseController(req: Request, res: Response): Promise<void>;
