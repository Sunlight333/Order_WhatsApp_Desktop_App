import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with fresh sample data...\n');

  // ─── CLEAN EXISTING DATA ──────────────────────────────
  console.log('🗑️  Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.orderProduct.deleteMany();
  await prisma.orderSupplier.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.config.deleteMany();
  console.log('✅ Database cleaned\n');

  // ─── Users ────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('1234', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: { username: 'admin', password: await bcrypt.hash('admin123', 10), role: 'SUPER_ADMIN' },
    }),
    prisma.user.create({
      data: { username: 'Adrian', password: hashedPassword, role: 'USER' },
    }),
    prisma.user.create({
      data: { username: 'David', password: hashedPassword, role: 'USER' },
    }),
    prisma.user.create({
      data: { username: 'Maria', password: hashedPassword, role: 'USER' },
    }),
  ]);

  const [adminUser, adrian, david, maria] = users;
  console.log(`✅ ${users.length} users created`);

  // ─── Suppliers ────────────────────────────────────────
  const supplierData = [
    { name: 'Iscan', description: 'Recambios de automoción e industrial' },
    { name: 'Ferretería Díaz', description: 'Ferretería y suministros industriales' },
    { name: 'Electro Canarias', description: 'Material eléctrico y electrónico' },
    { name: 'Fontanería López', description: 'Material de fontanería y calefacción' },
    { name: 'Pinturas del Sur', description: 'Pinturas, barnices y accesorios' },
    { name: 'Maderas Tenerife', description: 'Madera y derivados para construcción' },
    { name: 'Recambios Auto Guanche', description: 'Recambios de automoción' },
    { name: 'Distribuciones Atlántico', description: 'Distribución mayorista general' },
  ];

  const suppliers: Record<string, any> = {};
  for (const s of supplierData) {
    suppliers[s.name] = await prisma.supplier.create({ data: s });
  }
  console.log(`✅ ${Object.keys(suppliers).length} suppliers created`);

  // ─── Products (linked to suppliers) ──────────────────
  const productData = [
    // Iscan - recambios auto / industrial
    { supplierId: suppliers['Iscan'].id, reference: '6pk1690', defaultPrice: '8.50' },
    { supplierId: suppliers['Iscan'].id, reference: 'gdb1330', defaultPrice: '22.00' },
    { supplierId: suppliers['Iscan'].id, reference: 'w66', defaultPrice: '4.75' },
    { supplierId: suppliers['Iscan'].id, reference: 'ct1143', defaultPrice: '12.30' },
    { supplierId: suppliers['Iscan'].id, reference: 'la538', defaultPrice: '6.90' },
    // Ferretería Díaz
    { supplierId: suppliers['Ferretería Díaz'].id, reference: 'TORN-M8x50', defaultPrice: '0.35' },
    { supplierId: suppliers['Ferretería Díaz'].id, reference: 'BROCA-8mm', defaultPrice: '3.20' },
    { supplierId: suppliers['Ferretería Díaz'].id, reference: 'DISCO-CORTE-125', defaultPrice: '1.80' },
    { supplierId: suppliers['Ferretería Díaz'].id, reference: 'SILICONA-TRANSP', defaultPrice: '4.50' },
    { supplierId: suppliers['Ferretería Díaz'].id, reference: 'CERRADURA-70mm', defaultPrice: '14.00' },
    // Electro Canarias
    { supplierId: suppliers['Electro Canarias'].id, reference: 'CABLE-2.5mm-100m', defaultPrice: '45.00' },
    { supplierId: suppliers['Electro Canarias'].id, reference: 'LED-PANEL-60x60', defaultPrice: '22.00' },
    { supplierId: suppliers['Electro Canarias'].id, reference: 'ENCHUFE-SCHUKO', defaultPrice: '2.80' },
    { supplierId: suppliers['Electro Canarias'].id, reference: 'DIFERENCIAL-40A', defaultPrice: '18.50' },
    // Fontanería López
    { supplierId: suppliers['Fontanería López'].id, reference: 'TUBO-PVC-32mm', defaultPrice: '3.50' },
    { supplierId: suppliers['Fontanería López'].id, reference: 'CODO-90-32mm', defaultPrice: '0.90' },
    { supplierId: suppliers['Fontanería López'].id, reference: 'GRIFO-MONOMANDO', defaultPrice: '35.00' },
    // Pinturas del Sur
    { supplierId: suppliers['Pinturas del Sur'].id, reference: 'PINTURA-BLANCA-15L', defaultPrice: '42.00' },
    { supplierId: suppliers['Pinturas del Sur'].id, reference: 'RODILLO-25cm', defaultPrice: '5.50' },
    { supplierId: suppliers['Pinturas del Sur'].id, reference: 'MASILLA-INTERIOR-5kg', defaultPrice: '9.80' },
    // Maderas Tenerife
    { supplierId: suppliers['Maderas Tenerife'].id, reference: 'TABLON-PINO-2m', defaultPrice: '12.00' },
    { supplierId: suppliers['Maderas Tenerife'].id, reference: 'PANEL-MDF-16mm', defaultPrice: '28.00' },
    // Recambios Auto Guanche
    { supplierId: suppliers['Recambios Auto Guanche'].id, reference: 'PASTILLA-FRENO-DEL', defaultPrice: '25.00' },
    { supplierId: suppliers['Recambios Auto Guanche'].id, reference: 'FILTRO-ACEITE-W712', defaultPrice: '6.50' },
    { supplierId: suppliers['Recambios Auto Guanche'].id, reference: 'AMORTIGUADOR-DEL', defaultPrice: '48.00' },
    // Distribuciones Atlántico
    { supplierId: suppliers['Distribuciones Atlántico'].id, reference: 'CAJA-CARTON-40x30', defaultPrice: '1.20' },
    { supplierId: suppliers['Distribuciones Atlántico'].id, reference: 'PRECINTO-TRANSP-66m', defaultPrice: '2.10' },
  ];

  for (const p of productData) {
    await prisma.product.create({ data: p });
  }
  console.log(`✅ ${productData.length} products created`);

  // ─── Customers ────────────────────────────────────────
  const customerData = [
    { name: 'Javi Tuineje', phone: '628099889', countryCode: '+34' },
    { name: 'Alberto Casillas', phone: '616716951', countryCode: '+34' },
    { name: 'Guanyxemar', phone: '622334455', countryCode: '+34' },
    { name: 'Carlos Méndez', phone: '611223344', countryCode: '+34' },
    { name: 'Laura Betancor', phone: '655778899', countryCode: '+34' },
    { name: 'Pedro Santana', phone: '699112233', countryCode: '+34' },
    { name: 'Ana María Vega', phone: '633445566', countryCode: '+34' },
    { name: 'Miguel Hernández', phone: '677889900', countryCode: '+34' },
    { name: 'Rosa Domínguez', phone: '644556677', countryCode: '+34' },
    { name: 'Francisco Perera', phone: '688990011', countryCode: '+34' },
    { name: 'Construcciones Fuerteventura S.L.', phone: '928345678', countryCode: '+34' },
    { name: 'Restaurante El Mirador', phone: '928567890', countryCode: '+34' },
    { name: 'Taller Mecánico Doreste', phone: '928123456', countryCode: '+34' },
    { name: 'Antonio Cabrera', phone: '661234567', countryCode: '+34' },
    { name: 'Inmobiliaria Costa Calma', phone: '928654321', countryCode: '+34' },
  ];

  const customers: Record<string, any> = {};
  for (const c of customerData) {
    customers[c.name] = await prisma.customer.create({
      data: { ...c, createdById: adrian.id },
    });
  }
  console.log(`✅ ${Object.keys(customers).length} customers created`);

  // ─── Config ───────────────────────────────────────────
  await prisma.config.create({ data: { key: 'orderPrefix', value: '26' } });
  await prisma.config.create({ data: { key: 'orderCounter', value: '0' } });
  await prisma.config.create({
    data: { key: 'whatsapp_default_message', value: 'Hola {nombre}, tu pedido #{pedido} está listo para recoger. Un saludo.' },
  });

  // ─── Orders ───────────────────────────────────────────
  let orderCounter = 0;

  async function createSampleOrder(opts: {
    customer: any;
    createdBy: any;
    status: string;
    observations?: string;
    cancellationReason?: string;
    products: Array<{ supplier: string; ref: string; qty: string; price: string; received?: string }>;
    daysAgo: number;
    notifiedAt?: boolean;
  }) {
    orderCounter++;
    const orderNumber = parseInt(`26${String(orderCounter).padStart(3, '0')}`, 10);

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - opts.daysAgo);
    createdAt.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);

    const updatedAt = new Date();
    updatedAt.setDate(updatedAt.getDate() - Math.max(0, opts.daysAgo - 1));
    updatedAt.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: opts.customer.name,
        customerId: opts.customer.id,
        customerPhone: opts.customer.phone,
        countryCode: opts.customer.countryCode || '+34',
        status: opts.status,
        observations: opts.observations || null,
        cancellationReason: opts.cancellationReason || null,
        createdById: opts.createdBy.id,
        createdAt,
        updatedAt,
        notifiedAt: opts.notifiedAt ? updatedAt : null,
      },
    });

    // Create order products and order suppliers
    const supplierIds = new Set<string>();
    for (const p of opts.products) {
      const supplier = suppliers[p.supplier];
      supplierIds.add(supplier.id);
      await prisma.orderProduct.create({
        data: {
          orderId: order.id,
          supplierId: supplier.id,
          productRef: p.ref,
          quantity: p.qty,
          price: p.price,
          receivedQuantity: p.received ?? null,
        },
      });
    }

    // Create order-supplier relations
    for (const supplierId of supplierIds) {
      await prisma.orderSupplier.create({
        data: { orderId: order.id, supplierId },
      });
    }

    // Create audit log - "Created"
    await prisma.auditLog.create({
      data: {
        orderId: order.id,
        userId: opts.createdBy.id,
        action: 'CREATE',
        fieldChanged: 'order',
        oldValue: null,
        newValue: `Pedido #${orderNumber} creado`,
        timestamp: createdAt,
      },
    });

    // If status is not PENDING, add a status change audit log
    if (opts.status !== 'PENDING') {
      await prisma.auditLog.create({
        data: {
          orderId: order.id,
          userId: opts.createdBy.id,
          action: 'STATUS_CHANGE',
          fieldChanged: 'status',
          oldValue: 'PENDING',
          newValue: opts.status,
          timestamp: updatedAt,
        },
      });
    }

    return order;
  }

  // ──────────────────────────────────────────────────────
  // CREATE ORDERS - diverse statuses and realistic scenarios
  // ──────────────────────────────────────────────────────

  // 1. PENDING - Taller necesita recambios Iscan
  await createSampleOrder({
    customer: customers['Taller Mecánico Doreste'],
    createdBy: adrian,
    status: 'PENDING',
    products: [
      { supplier: 'Iscan', ref: '6pk1690', qty: '2', price: '8.50' },
      { supplier: 'Iscan', ref: 'gdb1330', qty: '1', price: '22.00' },
      { supplier: 'Iscan', ref: 'la538', qty: '2', price: '6.90' },
    ],
    daysAgo: 0,
  });

  // 2. PENDING - pedido simple de un cliente habitual
  await createSampleOrder({
    customer: customers['Javi Tuineje'],
    createdBy: david,
    status: 'PENDING',
    products: [
      { supplier: 'Iscan', ref: 'w66', qty: '4', price: '4.75' },
    ],
    daysAgo: 0,
  });

  // 3. PENDING - reforma de local (pedido grande, varios proveedores)
  await createSampleOrder({
    customer: customers['Restaurante El Mirador'],
    createdBy: maria,
    status: 'PENDING',
    observations: 'Pedido urgente. Necesitan todo para la reforma del local el lunes.',
    products: [
      { supplier: 'Electro Canarias', ref: 'LED-PANEL-60x60', qty: '15', price: '22.00' },
      { supplier: 'Electro Canarias', ref: 'ENCHUFE-SCHUKO', qty: '30', price: '2.80' },
      { supplier: 'Electro Canarias', ref: 'DIFERENCIAL-40A', qty: '2', price: '18.50' },
      { supplier: 'Pinturas del Sur', ref: 'PINTURA-BLANCA-15L', qty: '5', price: '42.00' },
      { supplier: 'Pinturas del Sur', ref: 'MASILLA-INTERIOR-5kg', qty: '3', price: '9.80' },
      { supplier: 'Fontanería López', ref: 'GRIFO-MONOMANDO', qty: '3', price: '35.00' },
    ],
    daysAgo: 1,
  });

  // 4. PENDING - ferretería
  await createSampleOrder({
    customer: customers['Antonio Cabrera'],
    createdBy: adrian,
    status: 'PENDING',
    observations: 'Llamar antes de las 14:00. Solo está por las mañanas.',
    products: [
      { supplier: 'Ferretería Díaz', ref: 'TORN-M8x50', qty: '100', price: '0.35' },
      { supplier: 'Ferretería Díaz', ref: 'BROCA-8mm', qty: '5', price: '3.20' },
      { supplier: 'Ferretería Díaz', ref: 'CERRADURA-70mm', qty: '2', price: '14.00' },
    ],
    daysAgo: 1,
  });

  // 5. PENDING - simple
  await createSampleOrder({
    customer: customers['Guanyxemar'],
    createdBy: david,
    status: 'PENDING',
    products: [
      { supplier: 'Iscan', ref: 'ct1143', qty: '1', price: '12.30' },
    ],
    daysAgo: 0,
  });

  // 6. INCOMPLETO - parcialmente recibido (material eléctrico)
  await createSampleOrder({
    customer: customers['Alberto Casillas'],
    createdBy: adrian,
    status: 'INCOMPLETO',
    products: [
      { supplier: 'Electro Canarias', ref: 'CABLE-2.5mm-100m', qty: '2', price: '45.00', received: '2' },
      { supplier: 'Electro Canarias', ref: 'LED-PANEL-60x60', qty: '10', price: '22.00', received: '6' },
      { supplier: 'Electro Canarias', ref: 'ENCHUFE-SCHUKO', qty: '20', price: '2.80' },
    ],
    daysAgo: 5,
  });

  // 7. INCOMPLETO - falta cable del proveedor
  await createSampleOrder({
    customer: customers['Carlos Méndez'],
    createdBy: adrian,
    status: 'INCOMPLETO',
    observations: 'Falta el cable. El proveedor lo envía la semana que viene.',
    products: [
      { supplier: 'Electro Canarias', ref: 'CABLE-2.5mm-100m', qty: '3', price: '45.00', received: '1' },
      { supplier: 'Electro Canarias', ref: 'LED-PANEL-60x60', qty: '4', price: '22.00', received: '4' },
    ],
    daysAgo: 3,
  });

  // 8. INCOMPLETO - recambios de auto parciales
  await createSampleOrder({
    customer: customers['Taller Mecánico Doreste'],
    createdBy: david,
    status: 'INCOMPLETO',
    observations: 'El amortiguador llega el jueves.',
    products: [
      { supplier: 'Recambios Auto Guanche', ref: 'PASTILLA-FRENO-DEL', qty: '2', price: '25.00', received: '2' },
      { supplier: 'Recambios Auto Guanche', ref: 'FILTRO-ACEITE-W712', qty: '3', price: '6.50', received: '3' },
      { supplier: 'Recambios Auto Guanche', ref: 'AMORTIGUADOR-DEL', qty: '2', price: '48.00' },
    ],
    daysAgo: 2,
  });

  // 9. RECEIVED (pendiente de avisar) - fontanería completa
  await createSampleOrder({
    customer: customers['Pedro Santana'],
    createdBy: maria,
    status: 'RECEIVED',
    products: [
      { supplier: 'Fontanería López', ref: 'GRIFO-MONOMANDO', qty: '2', price: '35.00', received: '2' },
      { supplier: 'Fontanería López', ref: 'TUBO-PVC-32mm', qty: '5', price: '3.50', received: '5' },
      { supplier: 'Fontanería López', ref: 'CODO-90-32mm', qty: '10', price: '0.90', received: '10' },
    ],
    daysAgo: 4,
  });

  // 10. RECEIVED - Iscan todo recibido
  await createSampleOrder({
    customer: customers['Laura Betancor'],
    createdBy: adrian,
    status: 'RECEIVED',
    products: [
      { supplier: 'Iscan', ref: '6pk1690', qty: '1', price: '8.50', received: '1' },
      { supplier: 'Iscan', ref: 'gdb1330', qty: '1', price: '22.00', received: '1' },
    ],
    daysAgo: 2,
  });

  // 11. NOTIFIED_WHATSAPP - avisado por WhatsApp
  await createSampleOrder({
    customer: customers['Javi Tuineje'],
    createdBy: adrian,
    status: 'NOTIFIED_WHATSAPP',
    notifiedAt: true,
    products: [
      { supplier: 'Iscan', ref: 'ct1143', qty: '2', price: '12.30', received: '2' },
      { supplier: 'Iscan', ref: 'w66', qty: '3', price: '4.75', received: '3' },
    ],
    daysAgo: 6,
  });

  // 12. NOTIFIED_CALL - avisado por llamada
  await createSampleOrder({
    customer: customers['Ana María Vega'],
    createdBy: david,
    status: 'NOTIFIED_CALL',
    notifiedAt: true,
    products: [
      { supplier: 'Pinturas del Sur', ref: 'PINTURA-BLANCA-15L', qty: '3', price: '42.00', received: '3' },
      { supplier: 'Pinturas del Sur', ref: 'RODILLO-25cm', qty: '4', price: '5.50', received: '4' },
    ],
    daysAgo: 7,
  });

  // 13. DELIVERED_COUNTER - recogido en mostrador
  await createSampleOrder({
    customer: customers['Rosa Domínguez'],
    createdBy: maria,
    status: 'DELIVERED_COUNTER',
    notifiedAt: true,
    products: [
      { supplier: 'Distribuciones Atlántico', ref: 'CAJA-CARTON-40x30', qty: '50', price: '1.20', received: '50' },
      { supplier: 'Distribuciones Atlántico', ref: 'PRECINTO-TRANSP-66m', qty: '12', price: '2.10', received: '12' },
    ],
    daysAgo: 10,
  });

  // 14. READY_TO_SEND - preparado para enviar (obra grande)
  await createSampleOrder({
    customer: customers['Construcciones Fuerteventura S.L.'],
    createdBy: adrian,
    status: 'READY_TO_SEND',
    notifiedAt: true,
    products: [
      { supplier: 'Maderas Tenerife', ref: 'TABLON-PINO-2m', qty: '20', price: '12.00', received: '20' },
      { supplier: 'Maderas Tenerife', ref: 'PANEL-MDF-16mm', qty: '10', price: '28.00', received: '10' },
      { supplier: 'Ferretería Díaz', ref: 'SILICONA-TRANSP', qty: '6', price: '4.50', received: '6' },
    ],
    daysAgo: 8,
  });

  // 15. READY_TO_SEND - inmobiliaria
  await createSampleOrder({
    customer: customers['Inmobiliaria Costa Calma'],
    createdBy: maria,
    status: 'READY_TO_SEND',
    notifiedAt: true,
    products: [
      { supplier: 'Ferretería Díaz', ref: 'CERRADURA-70mm', qty: '5', price: '14.00', received: '5' },
      { supplier: 'Pinturas del Sur', ref: 'PINTURA-BLANCA-15L', qty: '2', price: '42.00', received: '2' },
      { supplier: 'Pinturas del Sur', ref: 'MASILLA-INTERIOR-5kg', qty: '1', price: '9.80', received: '1' },
    ],
    daysAgo: 5,
  });

  // 16. SENT - enviado
  await createSampleOrder({
    customer: customers['Miguel Hernández'],
    createdBy: david,
    status: 'SENT',
    notifiedAt: true,
    products: [
      { supplier: 'Recambios Auto Guanche', ref: 'PASTILLA-FRENO-DEL', qty: '2', price: '25.00', received: '2' },
      { supplier: 'Recambios Auto Guanche', ref: 'FILTRO-ACEITE-W712', qty: '1', price: '6.50', received: '1' },
    ],
    daysAgo: 12,
  });

  // 17. SENT - enviado antiguo
  await createSampleOrder({
    customer: customers['Pedro Santana'],
    createdBy: david,
    status: 'SENT',
    notifiedAt: true,
    products: [
      { supplier: 'Ferretería Díaz', ref: 'SILICONA-TRANSP', qty: '12', price: '4.50', received: '12' },
      { supplier: 'Ferretería Díaz', ref: 'BROCA-8mm', qty: '3', price: '3.20', received: '3' },
    ],
    daysAgo: 20,
  });

  // 18. SENT - envío Construcciones
  await createSampleOrder({
    customer: customers['Construcciones Fuerteventura S.L.'],
    createdBy: adrian,
    status: 'SENT',
    notifiedAt: true,
    products: [
      { supplier: 'Electro Canarias', ref: 'CABLE-2.5mm-100m', qty: '5', price: '45.00', received: '5' },
      { supplier: 'Electro Canarias', ref: 'DIFERENCIAL-40A', qty: '4', price: '18.50', received: '4' },
    ],
    daysAgo: 15,
  });

  // 19. CANCELLED - cliente cambió de idea
  await createSampleOrder({
    customer: customers['Francisco Perera'],
    createdBy: adrian,
    status: 'CANCELLED',
    cancellationReason: 'El cliente ya no necesita el material. Cambió de proyecto.',
    products: [
      { supplier: 'Electro Canarias', ref: 'CABLE-2.5mm-100m', qty: '5', price: '45.00' },
    ],
    daysAgo: 18,
  });

  // 20. CANCELLED - presupuesto demasiado alto
  await createSampleOrder({
    customer: customers['Antonio Cabrera'],
    createdBy: david,
    status: 'CANCELLED',
    cancellationReason: 'Presupuesto demasiado alto, el cliente buscará otro proveedor.',
    products: [
      { supplier: 'Maderas Tenerife', ref: 'TABLON-PINO-2m', qty: '50', price: '12.00' },
      { supplier: 'Maderas Tenerife', ref: 'PANEL-MDF-16mm', qty: '30', price: '28.00' },
    ],
    daysAgo: 25,
  });

  // Update order counter in config
  await prisma.config.update({
    where: { key: 'orderCounter' },
    data: { value: String(orderCounter) },
  });

  console.log(`\n✅ ${orderCounter} orders created`);
  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Users available:');
  console.log('   admin / admin123  (Super Admin)');
  console.log('   Adrian / 1234     (User)');
  console.log('   David / 1234      (User)');
  console.log('   Maria / 1234      (User)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
