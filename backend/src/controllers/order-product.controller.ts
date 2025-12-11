import { Request, Response, NextFunction } from 'express';
import { updateProductReceivedQuantity } from '../services/order-product.service';
import { createSuccessResponse } from '../utils/response.util';
import { ApiError } from '../utils/error.util';

/**
 * PATCH /api/v1/orders/:orderId/products/:productId/received
 * Update received quantity for an order product
 */
export async function updateProductReceivedController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { productId } = req.params;
    const { receivedQuantity } = req.body;

    const updatedProduct = await updateProductReceivedQuantity(
      productId,
      receivedQuantity || null,
      req.user.userId
    );

    res.status(200).json(
      createSuccessResponse(updatedProduct, 'Product received quantity updated successfully')
    );
  } catch (error) {
    // Pass error to Express error middleware
    next(error);
  }
}

