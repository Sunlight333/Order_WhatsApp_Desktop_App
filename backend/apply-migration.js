// Script to manually apply the customer traceability migration
// Run this with: node apply-migration.js
// Make sure the server is stopped before running this

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🛠️ Applying customer traceability migration...');
    
    // Check if columns already exist
    const customerColumns = await prisma.$queryRaw`
      PRAGMA table_info("customers");
    `;
    const customerColumnNames = customerColumns.map(c => c.name.toLowerCase());
    
    if (!customerColumnNames.includes('createdbyid')) {
      console.log('   Adding createdById column...');
      await prisma.$executeRawUnsafe(`ALTER TABLE "customers" ADD COLUMN "createdById" TEXT;`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customers_createdById_idx" ON "customers"("createdById");`);
      console.log('   ✅ createdById column added');
    } else {
      console.log('   ℹ️  createdById column already exists');
    }
    
    if (!customerColumnNames.includes('updatedbyid')) {
      console.log('   Adding updatedById column...');
      await prisma.$executeRawUnsafe(`ALTER TABLE "customers" ADD COLUMN "updatedById" TEXT;`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "customers_updatedById_idx" ON "customers"("updatedById");`);
      console.log('   ✅ updatedById column added');
    } else {
      console.log('   ℹ️  updatedById column already exists');
    }
    
    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    if (error.message.includes('database is locked')) {
      console.error('   ⚠️  Database is locked. Please stop the server and try again.');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
