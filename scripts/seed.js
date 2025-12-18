// scripts/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Define all possible permissions in the application
const permissionsList = [
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
  { name: 'settings:manage_payments', description: 'Can manage payment methods' },
  { name: 'settings:manage_general', description: 'Can manage currency and tax settings' }, // <-- NEW
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
  await prisma.paymentMethod.deleteMany({});
  console.log('Cleared existing users, roles, permissions, customers, companies, and payment methods.');

  // --- Create all permissions ---
  for (const p of permissionsList) {
    await prisma.permission.upsert({
        where: { name: p.name },
        update: {},
        create: { name: p.name },
    });
  }
  console.log(`Created/Ensured ${permissionsList.length} permissions.`);

  // --- Fetch permissions for assignment ---
  const allPermissions = await prisma.permission.findMany();
  const allPermissionIds = allPermissions.map(p => ({ id: p.id }));

  const cashierPermissions = await prisma.permission.findMany({
    where: { name: { in: ['pos:access', 'discounts:apply'] } },
  });
  const cashierPermissionIds = cashierPermissions.map(p => ({ id: p.id }));

  const managerPermissions = await prisma.permission.findMany({
    where: { name: { not: 'settings:manage_roles' } }
  });
  const managerPermissionIds = managerPermissions.map(p => ({ id: p.id }));

  // --- Create/Update Roles ---
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: { permissions: { set: allPermissionIds } }, 
    create: {
      name: 'Admin',
      permissions: { connect: allPermissionIds },
    },
  });
  console.log('Created/Updated "Admin" role with all permissions.');

  const managerRole = await prisma.role.upsert({
     where: { name: 'Manager' },
     update: { permissions: { set: managerPermissionIds } },
     create: {
        name: 'Manager',
        permissions: { connect: managerPermissionIds }
    }
  });
  console.log('Created/Updated "Manager" role.');

  const cashierRole = await prisma.role.upsert({
    where: { name: 'Cashier' },
    update: { permissions: { set: cashierPermissionIds } },
    create: {
      name: 'Cashier',
      permissions: { connect: cashierPermissionIds },
    },
  });
  console.log('Created/Updated "Cashier" role.');

  // --- Initialize General POS Settings (Requested Defaults) ---
  const defaultGeneralSettings = [
    { key: 'currency_symbol', value: 'EGP' },
    { key: 'tax_label', value: 'VAT' },
    { key: 'tax_rate', value: '14' },
    { key: 'tax_inclusive', value: 'true' },
  ];

  for (const setting of defaultGeneralSettings) {
    await prisma.posSetting.upsert({
      where: { key: setting.key },
      update: {}, 
      create: setting,
    });
  }
  console.log('Initialized default currency and tax settings.');

  // --- Create Default Payment Methods ---
  const defaultMethods = [
      { name: 'Cash', displayOrder: 1, color: 'green', iconName: 'IconCash', iconSourceType: 'preset' },
      { name: 'Card', displayOrder: 2, color: 'blue', iconName: 'IconCreditCard', iconSourceType: 'preset' },
      { name: 'Wallet', displayOrder: 3, color: 'grape', iconName: 'IconWallet', iconSourceType: 'preset' },
      { name: 'Bank Transfer', displayOrder: 4, color: 'cyan', iconName: 'IconBuildingBank', iconSourceType: 'preset' },
  ];

  for (const method of defaultMethods) {
      await prisma.paymentMethod.upsert({
          where: { name: method.name },
          update: { 
              isActive: true, 
              displayOrder: method.displayOrder,
              color: method.color,
              iconName: method.iconName,
              iconSourceType: method.iconSourceType,
              customIconUrl: '',
          },
          create: { 
              name: method.name, 
              isActive: true, 
              displayOrder: method.displayOrder,
              color: method.color,
              iconName: method.iconName,
              iconSourceType: method.iconSourceType,
              customIconUrl: '',
          },
      });
  }
  console.log('Created default payment methods.');

  // --- Create Default Users ---
  await prisma.user.upsert({
    where: { id: 1 }, 
    update: { roleId: adminRole.id },
    create: {
      id: 1,
      name: 'Admin',
      pin: '1234',
      hourlyRate: 50.0,
      roleId: adminRole.id,
    },
  });
  console.log('Created default Admin user (PIN 1234).');

  await prisma.user.upsert({
     where: { id: 2 }, 
     update: { roleId: cashierRole.id },
     create: {
      id: 2,
      name: 'Cashier',
      pin: '1111',
      hourlyRate: 20.0,
      roleId: cashierRole.id,
    },
  });
  console.log('Created default Cashier user (PIN 1111).');

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });