// Script to check if customerAuditLogs table exists and create it if missing
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndCreateTable() {
  try {
    console.log('🔍 Checking if customerAuditLogs table exists...');
    
    // Check if table exists
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' AND name='customerAuditLogs';
    `;
    
    if (tables.length === 0) {
      console.log('❌ Table customerAuditLogs does not exist. Creating it...');
      
      // Create the table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "customerAuditLogs" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "customerId" TEXT,
          "userId" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "fieldChanged" TEXT,
          "oldValue" TEXT,
          "newValue" TEXT,
          "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "metadata" TEXT,
          FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `);
      
      // Create indexes
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customerAuditLogs_customerId_idx" ON "customerAuditLogs"("customerId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customerAuditLogs_userId_idx" ON "customerAuditLogs"("userId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customerAuditLogs_timestamp_idx" ON "customerAuditLogs"("timestamp");`);
      
      console.log('✅ Table customerAuditLogs created successfully!');
    } else {
      console.log('✅ Table customerAuditLogs already exists');
      
      // Check columns
      const columns = await prisma.$queryRaw`
        PRAGMA table_info("customerAuditLogs");
      `;
      console.log('📋 Table columns:', columns.map(c => c.name).join(', '));
      
      // Check if there are any audit logs
      const count = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "customerAuditLogs";
      `;
      console.log(`📊 Total audit logs: ${count[0].count}`);
    }
    
    // Try to create a test audit log to verify it works
    console.log('\n🧪 Testing audit log creation...');
    try {
      // Get first customer and user for testing
      const customer = await prisma.customer.findFirst();
      const user = await prisma.user.findFirst();
      
      if (customer && user) {
        const testLog = await prisma.customerAuditLog.create({
          data: {
            customerId: customer.id,
            userId: user.id,
            action: 'TEST',
            metadata: JSON.stringify({ test: true }),
          },
        });
        console.log('✅ Test audit log created successfully:', testLog.id);
        
        // Delete the test log
        await prisma.customerAuditLog.delete({
          where: { id: testLog.id },
        });
        console.log('✅ Test audit log deleted');
      } else {
        console.log('⚠️  No customers or users found for testing');
      }
    } catch (testError) {
      console.error('❌ Error creating test audit log:', testError.message);
      console.error('   This means the table exists but there might be a Prisma Client issue');
      console.error('   Try running: npx prisma generate');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('no such table')) {
      console.error('   The table does not exist. It should be created automatically on server start.');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateTable();
