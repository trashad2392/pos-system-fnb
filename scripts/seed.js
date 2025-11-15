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
  { name: 'settings:manage_pos', description: 'Can assign menus to POS order types' },
  // --- ADDED THIS LINE ---
  { name: 'customers:manage', description: 'Can manage customer accounts and company credit' },
];

async function main() {
  console.log('Start seeding...');

  // --- Clean up old data to prevent conflicts ---
  await prisma.shift.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});
  // --- NEW: Clear customer data too ---
  await prisma.customer.deleteMany({});
  await prisma.company.deleteMany({});
  // --- END NEW ---
  console.log('Cleared existing users, roles, permissions, customers, and companies.');

  // --- Create all permissions ---
  for (const p of permissions) {
    // Use upsert to avoid errors if run multiple times, though deleteMany should handle it
    await prisma.permission.upsert({
        where: { name: p.name },
        update: {},
        create: { name: p.name },
    });
  }
  console.log(`Created/Ensured ${permissions.length} permissions.`);

  // --- Create default roles and connect them to permissions ---
  const allPermissions = await prisma.permission.findMany();
  const allPermissionIds = allPermissions.map(p => ({ id: p.id }));

  const cashierPermissions = await prisma.permission.findMany({
    where: { name: { in: ['pos:access', 'discounts:apply'] } },
  });
  const cashierPermissionIds = cashierPermissions.map(p => ({ id: p.id }));

  const managerPermissions = await prisma.permission.findMany({
    // Manager gets everything except role management (will include settings:manage_pos now)
    where: { name: { not: 'settings:manage_roles' } }
  });
  const managerPermissionIds = managerPermissions.map(p => ({ id: p.id }));

  // Admin Role - gets all permissions
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: { permissions: { set: allPermissionIds } }, // Ensure it has all current permissions
    create: {
      name: 'Admin',
      permissions: { connect: allPermissionIds },
    },
  });
  console.log('Created/Updated "Admin" role with all permissions.');

  // Manager Role
  const managerRole = await prisma.role.upsert({
     where: { name: 'Manager' },
     update: { permissions: { set: managerPermissionIds } }, // Update permissions
     create: {
        name: 'Manager',
        permissions: { connect: managerPermissionIds }
    }
  });
  console.log('Created/Updated "Manager" role.');

  // Cashier Role
  const cashierRole = await prisma.role.upsert({
    where: { name: 'Cashier' },
    update: { permissions: { set: cashierPermissionIds } }, // Update permissions
    create: {
      name: 'Cashier',
      permissions: { connect: cashierPermissionIds },
    },
  });
  console.log('Created/Updated "Cashier" role with limited permissions.');

  // --- Create default users and assign them roles ---
  // Use upsert for users too, updating roleId if they exist
  await prisma.user.upsert({
    where: { id: 1 }, // Assuming Admin might have ID 1, adjust if needed or use a unique field like name if defined
    update: { roleId: adminRole.id },
    create: {
      name: 'Admin',
      pin: '1234',
      hourlyRate: 50.0,
      roleId: adminRole.id,
    },
  });
  console.log('Created/Updated default Admin user with PIN 1234.');

  await prisma.user.upsert({
     where: { id: 2 }, // Assuming Cashier might have ID 2
     update: { roleId: cashierRole.id },
     create: {
      name: 'Cashier',
      pin: '1111',
      hourlyRate: 20.0,
      roleId: cashierRole.id,
    },
  });
  console.log('Created/Updated default Cashier user with PIN 1111.');

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