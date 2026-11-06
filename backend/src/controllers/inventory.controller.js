const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

// req #10, #12: real-time stock balance by product and location; quantity at each warehouse.
const list = asyncHandler(async (req, res) => {
  const { warehouseId, productId, lowStockOnly } = req.query;
  const where = {};
  if (warehouseId) where.warehouseId = warehouseId;
  if (productId) where.productId = productId;

  const inventory = await prisma.inventory.findMany({
    where,
    include: { product: { include: { category: true, brand: true } }, warehouse: true, primaryLocation: true },
    orderBy: { updatedAt: 'desc' },
  });

  let data = inventory.map((i) => ({
    ...i,
    availableStock: i.quantityOnHand - i.quantityReserved,
  }));

  if (lowStockOnly === 'true') {
    data = data.filter((i) => i.availableStock <= i.product.reorderLevel);
  }

  res.json({ data });
});

const getByProduct = asyncHandler(async (req, res) => {
  const inventory = await prisma.inventory.findMany({
    where: { productId: req.params.productId },
    include: { warehouse: true },
  });
  res.json({ data: inventory });
});

// req #11: the inventory ledger for a product (optionally scoped to a warehouse).
const getMovements = asyncHandler(async (req, res) => {
  const { warehouseId, from, to } = req.query;
  const where = { productId: req.params.productId };
  if (warehouseId) where.warehouseId = warehouseId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  const movements = await prisma.inventoryTransaction.findMany({
    where,
    include: { warehouse: true, user: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: movements });
});

module.exports = { list, getByProduct, getMovements };
