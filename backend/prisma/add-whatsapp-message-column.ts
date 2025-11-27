import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addWhatsAppMessageColumn() {
  try {
    console.log('Adding whatsappMessage column to users table...');
    
    // SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we need to check first
    // But since Prisma handles this, we'll use raw SQL with try-catch
    await prisma.$executeRaw`
      ALTER TABLE users ADD COLUMN whatsappMessage TEXT;
    `;
    
    console.log('✅ Successfully added whatsappMessage column to users table');
  } catch (error: any) {
    // If column already exists, that's fine
    if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
      console.log('⚠️ Column whatsappMessage already exists, skipping...');
    } else {
      console.error('❌ Error adding whatsappMessage column:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

addWhatsAppMessageColumn();

