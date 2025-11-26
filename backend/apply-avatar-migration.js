// Simple script to add avatar column to users table
// Run this after stopping the dev server: node apply-avatar-migration.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding avatar column to users table...');
    
    // Check if column already exists by trying to select it
    try {
      await prisma.$queryRaw`SELECT avatar FROM users LIMIT 1`;
      console.log('✅ Avatar column already exists');
    } catch (error) {
      // Column doesn't exist, add it
      await prisma.$executeRaw`ALTER TABLE users ADD COLUMN avatar TEXT;`;
      console.log('✅ Avatar column added successfully!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

