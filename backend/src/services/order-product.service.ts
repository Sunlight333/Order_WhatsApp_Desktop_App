import { getPrismaClient } from '../config/database';
import { createError } from '../utils/error.util';
import { calculateOrderStatus } from './order-status-calculator';

const prisma = getPrismaClient();

/**
 * Update received quantity for an order product
 */
export async function updateProductReceivedQuantity(
  orderProductId: string,
  receivedQuantity: string | null,
  userId: string
) {
  // Get the order product
  const orderProduct = await prisma.orderProduct.findUnique({
    where: { id: orderProductId },
    include: {
      order: true,
    },
  });

  if (!orderProduct) {
    throw createError('ORDER_PRODUCT_NOT_FOUND', 'Order product not found', 404);
  }

  // Validate received quantity
  const quantity = parseFloat(orderProduct.quantity || '0');
  const received = receivedQuantity ? parseFloat(receivedQuantity) : 0;

  if (received < 0) {
    throw createError('INVALID_QUANTITY', 'Received quantity cannot be negative', 400);
  }

  if (received > quantity) {
    throw createError('INVALID_QUANTITY', 'Received quantity cannot exceed ordered quantity', 400);
  }

  // Update the received quantity
  await prisma.orderProduct.update({
    where: { id: orderProductId },
    data: {
      receivedQuantity: receivedQuantity || null,
    },
  });

  // Recalculate and update order status based on received quantities
  const order = await prisma.order.findUnique({
    where: { id: orderProduct.orderId },
    include: {
      products: true,
    },
  });

  if (!order) {
    throw createError('ORDER_NOT_FOUND', 'Order not found', 404);
  }

  // Calculate new status
  const newStatus = calculateOrderStatus(order.products);

  // Update order status if it changed
  if (newStatus !== order.status) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
      },
    });
  }

  // Return updated order product with order info
  const updatedProduct = await prisma.orderProduct.findUnique({
    where: { id: orderProductId },
    include: {
      order: {
        include: {
          products: true,
        },
      },
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!updatedProduct) {
    throw createError('ORDER_PRODUCT_NOT_FOUND', 'Order product not found after update', 404);
  }

  return updatedProduct;
}

