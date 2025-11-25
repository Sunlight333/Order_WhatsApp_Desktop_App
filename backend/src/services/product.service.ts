import { getPrismaClient } from '../config/database';

const prisma = getPrismaClient();

/**
 * List products by supplier (for autocomplete hints)
 */
export async function listProductsBySupplier(supplierId?: string) {
  const where: any = {};
  
  if (supplierId) {
    where.supplierId = supplierId;
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { reference: 'asc' },
    select: {
      id: true,
      supplierId: true,
      reference: true,
    },
  });

  return products;
}

