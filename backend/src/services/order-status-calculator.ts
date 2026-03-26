import { OrderProduct } from '@prisma/client';

/**
 * Calculate order status based on received quantities
 * - PENDING: No products received
 * - INCOMPLETO: Some products received but not all
 * - RECEIVED: All products fully received
 */
export function calculateOrderStatus(products: OrderProduct[]): string {
  // Only consider active (non-deleted) products
  const activeProducts = products.filter(p => !p.deletionReason);

  if (activeProducts.length === 0) {
    return 'PENDING';
  }

  let allReceived = true;
  let someReceived = false;

  for (const product of activeProducts) {
    const quantity = parseFloat(product.quantity || '0');
    const received = product.receivedQuantity ? parseFloat(product.receivedQuantity) : 0;

    if (received > 0) {
      someReceived = true;
    }

    if (received < quantity) {
      allReceived = false;
    }
  }

  if (allReceived && someReceived) {
    return 'RECEIVED';
  } else if (someReceived && !allReceived) {
    return 'INCOMPLETO';
  } else {
    return 'PENDING';
  }
}

