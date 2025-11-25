import { getPrismaClient } from '../config/database';

const prisma = getPrismaClient();

/**
 * List all suppliers (for autocomplete hints)
 */
export async function listSuppliers() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
    },
  });

  return suppliers;
}

