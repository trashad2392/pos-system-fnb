// scripts/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Define all possible permissions in the application
const permissions = [
  { name: 'pos:access', description: 'Can access the Point of Sale screen' },
  { name: 'inventory:manage', description: 'Can add/edit products, categories, and modifiers' },
  { name: 'sales:view_reports', description: 'Can view the sales dashboard and detailed reports' },
  { name: 'orders:void', description: 'Can void paid orders and items' },
  { name: 'settings:manage_users', description: 'Can add/edit staff members' },
  { name: 'settings:manage_roles', description: 'Can create/edit roles and their permissions' },
  { name: 'discounts:apply', description: 'Can apply discounts to orders and items' },
  { name: 'discounts:manage', description: 'Can create and edit discounts' },
];

async function main() {
  console.log('Start seeding...');

  // --- Clean up old data to prevent conflicts ---
  // The order is important due to foreign key constraints
  await prisma.shift.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});
  console.log('Cleared existing users, roles, and permissions.');

  // --- Create all permissions ---
  for (const p of permissions) {
    await prisma.permission.create({
      data: { name: p.name },
    });
  }
  console.log(`Created ${permissions.length} permissions.`);

  // --- Create default roles and connect them to permissions ---
  const allPermissions = await prisma.permission.findMany();
  const allPermissionIds = allPermissions.map(p => ({ id: p.id }));
  
  const cashierPermissions = await prisma.permission.findMany({
    where: { name: { in: ['pos:access', 'discounts:apply'] } },
  });
  const cashierPermissionIds = cashierPermissions.map(p => ({ id: p.id }));

  const managerPermissions = await prisma.permission.findMany({
    where: { name: { not: 'settings:manage_roles' } } // Manager gets everything except role management
  });
  const managerPermissionIds = managerPermissions.map(p => ({ id: p.id }));

  const adminRole = await prisma.role.create({
    data: {
      name: 'Admin',
      permissions: { connect: allPermissionIds },
    },
  });
  console.log('Created "Admin" role with all permissions.');
  
  const managerRole = await prisma.role.create({
    data: {
        name: 'Manager',
        permissions: { connect: managerPermissionIds }
    }
  });
  console.log('Created "Manager" role.');

  const cashierRole = await prisma.role.create({
    data: {
      name: 'Cashier',
      permissions: { connect: cashierPermissionIds },
    },
  });
  console.log('Created "Cashier" role with limited permissions.');

  // --- Create default users and assign them roles ---
  await prisma.user.create({
    data: {
      name: 'Admin',
      pin: '1234',
      hourlyRate: 50.0,
      roleId: adminRole.id,
    },
  });
  console.log('Created default Admin user with PIN 1234.');

  await prisma.user.create({
    data: {
      name: 'Cashier',
      pin: '1111',
      hourlyRate: 20.0,
      roleId: cashierRole.id,
    },
  });
  console.log('Created default Cashier user with PIN 1111.');

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