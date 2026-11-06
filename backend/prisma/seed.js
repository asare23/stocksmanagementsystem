const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PERMISSIONS = [
  'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE',
  'STOCK_VIEW', 'STOCK_RECEIVE', 'STOCK_TRANSFER', 'STOCK_ADJUST',
  'SALES_CREATE', 'SALES_CANCEL', 'SALES_RETURN',
  'PURCHASE_CREATE', 'PURCHASE_APPROVE',
  'REPORT_VIEW', 'USER_MANAGE',
];

// req #2: role -> permission mapping mirroring the described responsibilities.
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: PERMISSIONS, // full access
  STOCK_MANAGER: ['PRODUCT_CREATE', 'PRODUCT_UPDATE', 'STOCK_VIEW', 'STOCK_RECEIVE', 'STOCK_TRANSFER', 'STOCK_ADJUST', 'REPORT_VIEW'],
  PROCUREMENT_OFFICER: ['PURCHASE_CREATE', 'PURCHASE_APPROVE', 'STOCK_RECEIVE', 'STOCK_VIEW', 'REPORT_VIEW'],
  SALES_OFFICER: ['SALES_CREATE', 'SALES_CANCEL', 'SALES_RETURN', 'STOCK_VIEW', 'REPORT_VIEW'],
  CASHIER: ['SALES_CREATE', 'STOCK_VIEW'],
  ACCOUNTANT: ['REPORT_VIEW', 'STOCK_VIEW'],
  AUDITOR: ['REPORT_VIEW', 'STOCK_VIEW'],
};

async function main() {
  console.log('Seeding permissions...');
  const permissionRecords = {};
  for (const code of PERMISSIONS) {
    permissionRecords[code] = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code },
    });
  }

  console.log('Seeding roles...');
  const roleRecords = {};
  for (const [roleName, codes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        isSystem: true,
        description: `${roleName.replace(/_/g, ' ')} (seeded default role)`,
        rolePermissions: { create: codes.map((code) => ({ permissionId: permissionRecords[code].id })) },
      },
    });
    roleRecords[roleName] = role;
  }

  console.log('Seeding company / branch / warehouse...');
  const company = await prisma.company.upsert({
    where: { id: 'seed-company' },
    update: {},
    create: { id: 'seed-company', name: 'IA Auto Trading', currency: 'GHS', taxRate: 15 },
  });

  const branch = await prisma.branch.upsert({
    where: { code: 'HQ' },
    update: {},
    create: { companyId: company.id, code: 'HQ', name: 'Abossey Okai HQ', address: 'Abossey Okai, Accra, Ghana' },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-01' },
    update: {},
    create: { branchId: branch.id, code: 'WH-01', name: 'Main Warehouse' },
  });

  console.log('Seeding admin user...');
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sms.local' },
    update: {},
    create: {
      fullName: 'System Administrator',
      email: 'admin@sms.local',
      employeeCode: 'EMP-0001',
      passwordHash: adminPasswordHash,
      roleId: roleRecords.SUPER_ADMIN.id,
      branchId: branch.id,
      status: 'ACTIVE',
    },
  });

  // One user per role, for demoing role-based access without editing users.
  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    if (roleName === 'SUPER_ADMIN') continue;
    const email = `${roleName.toLowerCase().replace(/_/g, '.')}@sms.local`;
    const passwordHash = await bcrypt.hash('Password@123', 12);
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        fullName: roleName.replace(/_/g, ' ').replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase()),
        email,
        passwordHash,
        roleId: roleRecords[roleName].id,
        branchId: branch.id,
        status: 'ACTIVE',
      },
    });
  }

  console.log('Seeding categories / brands / units...');
  const engine = await prisma.productCategory.create({ data: { name: 'Engine' } });
  const filters = await prisma.productCategory.create({ data: { name: 'Filters', parentId: engine.id } });
  const brakes = await prisma.productCategory.create({ data: { name: 'Brake System' } });
  const electrical = await prisma.productCategory.create({ data: { name: 'Electrical' } });

  const brandBosch = await prisma.productBrand.upsert({ where: { name: 'Bosch' }, update: {}, create: { name: 'Bosch' } });
  const brandDenso = await prisma.productBrand.upsert({ where: { name: 'Denso' }, update: {}, create: { name: 'Denso' } });

  const unitPcs = await prisma.productUnit.upsert({ where: { name: 'Piece' }, update: {}, create: { name: 'Piece', abbreviation: 'PCS' } });

  console.log('Seeding sample products...');
  const products = [
    { sku: 'OF-1001', name: 'Oil Filter - Toyota Corolla', categoryId: filters.id, brandId: brandBosch.id, unitId: unitPcs.id, costPrice: 15, sellingPrice: 25, reorderLevel: 10, reorderQuantity: 50 },
    { sku: 'BP-2001', name: 'Brake Pads (Front) - Honda Civic', categoryId: brakes.id, brandId: brandDenso.id, unitId: unitPcs.id, costPrice: 60, sellingPrice: 95, reorderLevel: 5, reorderQuantity: 20 },
    { sku: 'ALT-3001', name: 'Alternator - Nissan Almera', categoryId: electrical.id, brandId: brandBosch.id, unitId: unitPcs.id, costPrice: 350, sellingPrice: 520, reorderLevel: 2, reorderQuantity: 5, isSerialTracked: true },
  ];
  const createdProducts = [];
  for (const p of products) {
    const product = await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p });
    createdProducts.push(product);
  }

  console.log('Seeding a supplier, a customer and opening stock...');
  const supplier = await prisma.supplier.upsert({
    where: { code: 'SUP-001' },
    update: {},
    create: { code: 'SUP-001', name: 'Global Auto Parts Ltd', phone: '+233200000000', country: 'Ghana', paymentTerms: 'Net 30' },
  });

  await prisma.customer.upsert({
    where: { code: 'WALKIN' },
    update: {},
    create: { code: 'WALKIN', name: 'Walk-in Customer', customerType: 'WALK_IN' },
  });

  for (const product of createdProducts) {
    const existing = await prisma.inventory.findFirst({ where: { productId: product.id, warehouseId: warehouse.id } });
    if (!existing) {
      const openingQty = 40;
      const inv = await prisma.inventory.create({
        data: { productId: product.id, warehouseId: warehouse.id, quantityOnHand: openingQty },
      });
      await prisma.inventoryTransaction.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          txnType: 'OPENING_STOCK',
          quantityIn: openingQty,
          quantityOut: 0,
          balanceAfter: openingQty,
          unitCost: product.costPrice,
          reference: 'OPENING-BALANCE',
          sourceType: 'OPENING',
          sourceId: product.id,
          userId: admin.id,
        },
      });
    }
  }

  console.log('Seed complete.');
  console.log('---------------------------------------------------------');
  console.log('Login as: admin@sms.local / Admin@12345 (SUPER_ADMIN)');
  console.log('Other seeded users (password: Password@123):');
  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    if (roleName === 'SUPER_ADMIN') continue;
    console.log(`  ${roleName.toLowerCase().replace(/_/g, '.')}@sms.local`);
  }
  console.log('---------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
