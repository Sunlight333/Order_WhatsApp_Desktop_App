import { Request, Response, NextFunction } from 'express';
export declare const errorMiddleware: (error: Error, req: Request, res: Response, next: NextFunction) => void;
