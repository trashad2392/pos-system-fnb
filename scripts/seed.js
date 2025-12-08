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
  { name: 'customers:manage', description: 'Can manage customer accounts and company credit' },
  { name: 'settings:manage_payments', description: 'Can manage payment methods' }, // <-- NEW PERMISSION
];

async function main() {
  console.log('Start seeding...');

  // --- Clean up old data to prevent conflicts ---
  await prisma.shift.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.paymentMethod.deleteMany({}); // <-- NEW: Clear payment methods
  console.log('Cleared existing users, roles, permissions, customers, companies, and payment methods.');

  // --- Create all permissions ---
  for (const p of permissions) {
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
    // Manager gets everything except role management
    where: { name: { not: 'settings:manage_roles' } }
  });
  const managerPermissionIds = managerPermissions.map(p => ({ id: p.id }));

  // Admin Role - gets all permissions
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: { permissions: { set: allPermissionIds } }, 
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
  
  // --- MODIFIED: Create Default Payment Methods (Removed Credit, Added color/icon) ---
  const defaultMethods = [
      { name: 'Cash', displayOrder: 1, isActive: true, color: 'green', icon: 'IconCash' }, 
      { name: 'Card', displayOrder: 2, color: 'blue', icon: 'IconCreditCard' },
      { name: 'Wallet', displayOrder: 3, color: 'grape', icon: 'IconWallet' },
      { name: 'Bank Transfer', displayOrder: 4, color: 'cyan', icon: 'IconBuildingBank' },
      // Credit is intentionally excluded to prevent it appearing as a full payment option.
  ];

  for (const method of defaultMethods) {
      await prisma.paymentMethod.upsert({
          where: { name: method.name },
          update: { 
              isActive: method.isActive !== undefined ? method.isActive : true, 
              displayOrder: method.displayOrder,
              color: method.color,
              icon: method.icon,
          },
          create: { 
              name: method.name, 
              isActive: method.isActive !== undefined ? method.isActive : true, 
              displayOrder: method.displayOrder,
              color: method.color,
              icon: method.icon,
          },
      });
  }
  console.log('Created default payment methods.');
  // --- END MODIFIED ---

  // --- Create default users and assign them roles ---
  await prisma.user.upsert({
    where: { id: 1 }, 
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
     where: { id: 2 }, 
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