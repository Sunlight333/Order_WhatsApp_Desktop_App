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
      supplier: {
        select: { id: true, name: true },
      },
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

  const oldReceivedQuantity = orderProduct.receivedQuantity || '0';

  // Update the received quantity
  await prisma.orderProduct.update({
    where: { id: orderProductId },
    data: {
      receivedQuantity: receivedQuantity || null,
    },
  });

  // Create audit log for quantity change
  await prisma.auditLog.create({
    data: {
      orderId: orderProduct.orderId,
      userId,
      action: 'UPDATE',
      fieldChanged: 'receivedQuantity',
      oldValue: oldReceivedQuantity,
      newValue: receivedQuantity || '0',
      metadata: JSON.stringify({
        productRef: orderProduct.productRef,
        supplierName: orderProduct.supplier.name,
        supplierId: orderProduct.supplierId,
        orderedQuantity: orderProduct.quantity,
      }),
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

  // Skip status recalculation if order is CANCELLED
  // The product can still receive quantity updates (to remove from pending products list)
  // but the order status should remain CANCELLED
  if (order.status !== 'CANCELLED') {
    // Calculate new status
    const newStatus = calculateOrderStatus(order.products);

    // Update order status if it changed
    if (newStatus !== order.status) {
      await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
        where: { id: order.id },
        data: {
          status: newStatus,
        },
        });

        // Create audit log for automatic status change
        await tx.auditLog.create({
          data: {
            orderId: order.id,
            userId,
            action: 'STATUS_CHANGE',
            fieldChanged: 'status',
            oldValue: order.status,
            newValue: newStatus,
            metadata: JSON.stringify({
              automatic: true,
              reason: `Cantidad recibida actualizada para ${orderProduct.productRef} (${orderProduct.supplier.name}) - estado recalculado`,
              productRef: orderProduct.productRef,
              supplierName: orderProduct.supplier.name,
            }),
          },
        });
      });
    }
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

/**
 * Delete an order product from an order
 */
export async function deleteOrderProduct(
  orderProductId: string,
  userId: string,
  reason?: string
) {
  if (!reason || reason.trim().length === 0) {
    throw createError('REASON_REQUIRED', 'Se requiere un motivo para eliminar el producto', 400);
  }

  // Get the order product with order and supplier info
  const orderProduct = await prisma.orderProduct.findUnique({
    where: { id: orderProductId },
    include: {
      order: true,
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!orderProduct) {
    throw createError('ORDER_PRODUCT_NOT_FOUND', 'Order product not found', 404);
  }

  if (orderProduct.deletionReason) {
    throw createError('ALREADY_DELETED', 'This product has already been deleted', 400);
  }

  const orderId = orderProduct.orderId;
  const productInfo = `${orderProduct.supplier.name} - ${orderProduct.productRef} (Cant: ${orderProduct.quantity}, Precio: ${orderProduct.price})`;

  // Soft-delete the order product and create audit log in a transaction
  await prisma.$transaction(async (tx) => {
    // Mark the order product as deleted
    await tx.orderProduct.update({
      where: { id: orderProductId },
      data: {
        deletionReason: reason.trim(),
        deletedAt: new Date(),
      },
    });

    // Create audit log for product deletion
    await tx.auditLog.create({
      data: {
        orderId,
        userId,
        action: 'PRODUCT_DELETED',
        fieldChanged: 'products',
        oldValue: productInfo,
        newValue: reason.trim(),
        metadata: JSON.stringify({
          deletedProduct: {
            id: orderProduct.id,
            supplierId: orderProduct.supplierId,
            supplierName: orderProduct.supplier.name,
            productRef: orderProduct.productRef,
            quantity: orderProduct.quantity,
            price: orderProduct.price,
            receivedQuantity: orderProduct.receivedQuantity,
            deletionReason: reason.trim(),
          },
        }),
      },
    });
  });

  // Recalculate order status after product deletion
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      products: true,
    },
  });

  // Skip status recalculation if order is CANCELLED
  if (order && order.products.length > 0 && order.status !== 'CANCELLED') {
    const newStatus = calculateOrderStatus(order.products);

    if (newStatus !== order.status) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status: newStatus },
        });

        await tx.auditLog.create({
          data: {
            orderId,
            userId,
            action: 'STATUS_CHANGE',
            fieldChanged: 'status',
            oldValue: order.status,
            newValue: newStatus,
            metadata: JSON.stringify({
              automatic: true,
              reason: 'Product deleted - status recalculated',
            }),
          },
        });
      });
    }
  }

  return { success: true, orderId };
}

