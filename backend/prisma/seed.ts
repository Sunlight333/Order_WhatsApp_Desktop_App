import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default admin user
  const adminUsername = 'admin';
  const adminPassword = 'admin123';

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists, skipping creation');
  } else {
    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
      },
    });

    console.log('✅ Admin user created:');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${admin.role}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
