// scripts/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');
  
  // Check if an admin user already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'Admin' },
  });

  if (existingAdmin) {
    console.log('Admin user already exists.');
  } else {
    // Create the first Admin user
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin',
        pin: '1234', // In a real app, this should be securely hashed
        role: 'Admin',
        hourlyRate: 50.0,
        isActive: true,
      },
    });
    console.log('Created admin user:', adminUser);
  }
  
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });