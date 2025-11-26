import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAvatarColumn() {
  try {
    console.log('Adding avatar column to users table...');
    
    // Use raw SQL to add the column
    await prisma.$executeRaw`ALTER TABLE users ADD COLUMN avatar TEXT;`;
    
    console.log('✅ Avatar column added successfully!');
  } catch (error: any) {
    if (error.message?.includes('duplicate column name')) {
      console.log('✅ Avatar column already exists');
    } else {
      console.error('❌ Error adding avatar column:', error.message);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

addAvatarColumn();

