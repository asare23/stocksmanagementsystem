const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

function dateRange(query) {
  const where = {};
  if (query.from || query.to) {
    where.gte = query.from ? new Date(query.from) : undefined;
    where.lte = query.to ? new Date(query.to) : undefined;
  }
  return Object.keys(where).length ? where : undefined;
}

// --- Inventory reports (req #31.1) ---------------------------------------

const currentStock = asyncHandler(async (req, res) => {
  const { warehouseId } = req.query;
  const where = warehouseId ? { warehouseId } : {};
  const data = await prisma.inventory.findMany({ where, include: { product: true, warehouse: true } });
  res.json({ data: data.map((i) => ({ ...i, availableStock: i.quantityOnHand - i.quantityReserved })) });
});

const stockValuation = asyncHandler(async (req, res) => {
  const data = await prisma.inventory.findMany({ include: { product: true, warehouse: true } });
  const rows = data.map((i) => ({
    product: i.product.name,
    sku: i.product.sku,
    warehouse: i.warehouse.name,
    quantityOnHand: i.quantityOnHand,
    costPrice: Number(i.product.costPrice),
    value: i.quantityOnHand * Number(i.product.costPrice),
  }));
  res.json({ data: rows, totalValue: rows.reduce((s, r) => s + r.value, 0) });
});

const stockLedger = asyncHandler(async (req, res) => {
  const { productId, warehouseId } = req.query;
  const where = {};
  if (productId) where.productId = productId;
  if (warehouseId) where.warehouseId = warehouseId;
  const createdAt = dateRange(req.query);
  if (createdAt) where.createdAt = createdAt;
  const data = await prisma.inventoryTransaction.findMany({
    where,
    include: { product: true, warehouse: true, user: { select: { fullName: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ data });
});

const deadStock = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 90;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const inventory = await prisma.inventory.findMany({ where: { quantityOnHand: { gt: 0 } }, include: { product: true } });
  const recentSales = await prisma.saleItem.findMany({ where: { sale: { createdAt: { gte: since } } }, select: { productId: true } });
  const soldRecently = new Set(recentSales.map((s) => s.productId));
  res.json({ data: inventory.filter((i) => !soldRecently.has(i.productId)) });
});

const movementReport = asyncHandler(async (req, res, rank) => {
  const days = Number(req.query.days) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const grouped = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: { sale: { createdAt: { gte: since } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: rank } },
    take: 20,
  });
  const products = await prisma.product.findMany({ where: { id: { in: grouped.map((g) => g.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));
  res.json({ data: grouped.map((g) => ({ product: productMap.get(g.productId), quantitySold: g._sum.quantity })) });
});
const fastMoving = asyncHandler((req, res) => movementReport(req, res, 'desc'));
const slowMoving = asyncHandler((req, res) => movementReport(req, res, 'asc'));

// --- Sales reports (req #31.2) --------------------------------------------

const salesByPeriod = asyncHandler(async (req, res) => {
  const { groupBy = 'day' } = req.query; // day | month
  const createdAt = dateRange(req.query);
  const sales = await prisma.sale.findMany({ where: { createdAt, status: { not: 'REVERSED' } }, select: { createdAt: true, total: true } });
  const key = (d) => (groupBy === 'month' ? d.toISOString().slice(0, 7) : d.toISOString().slice(0, 10));
  const grouped = {};
  for (const s of sales) grouped[key(s.createdAt)] = (grouped[key(s.createdAt)] || 0) + Number(s.total);
  res.json({ data: Object.entries(grouped).map(([period, total]) => ({ period, total })).sort((a, b) => a.period.localeCompare(b.period)) });
});

const salesByDimension = asyncHandler(async (req, res) => {
  const { by = 'product' } = req.query; // product | category | salesperson | branch | customer
  const createdAt = dateRange(req.query);
  const sales = await prisma.sale.findMany({
    where: { createdAt, status: { not: 'REVERSED' } },
    include: { items: { include: { product: { include: { category: true } } } }, salesPerson: true, branch: true, customer: true },
  });

  const totals = new Map();
  for (const sale of sales) {
    for (const item of sale.items) {
      let key;
      if (by === 'product') key = item.product.name;
      else if (by === 'category') key = item.product.category?.name || 'Uncategorized';
      else if (by === 'salesperson') key = sale.salesPerson.fullName;
      else if (by === 'branch') key = sale.branch.name;
      else if (by === 'customer') key = sale.customer?.name || 'Walk-in';
      totals.set(key, (totals.get(key) || 0) + Number(item.lineTotal));
    }
  }
  res.json({ data: Array.from(totals.entries()).map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total) });
});

const profitByProduct = asyncHandler(async (req, res) => {
  const createdAt = dateRange(req.query);
  const items = await prisma.saleItem.findMany({
    where: { sale: { createdAt, status: { not: 'REVERSED' } } },
    include: { product: true },
  });
  const totals = new Map();
  for (const i of items) {
    const key = i.product.id;
    const entry = totals.get(key) || { product: i.product.name, sku: i.product.sku, revenue: 0, cost: 0, quantitySold: 0 };
    entry.revenue += Number(i.lineTotal);
    entry.cost += i.quantity * Number(i.product.costPrice);
    entry.quantitySold += i.quantity;
    totals.set(key, entry);
  }
  const data = Array.from(totals.values()).map((e) => ({ ...e, grossProfit: e.revenue - e.cost }));
  res.json({ data: data.sort((a, b) => b.grossProfit - a.grossProfit) });
});

// --- Purchase reports (req #31.3) -----------------------------------------

const purchaseHistory = asyncHandler(async (req, res) => {
  const { supplierId } = req.query;
  const where = {};
  if (supplierId) where.supplierId = supplierId;
  const createdAt = dateRange(req.query);
  if (createdAt) where.createdAt = createdAt;
  const data = await prisma.purchaseOrder.findMany({ where, include: { supplier: true, items: true }, orderBy: { createdAt: 'desc' } });
  res.json({ data });
});

const outstandingPOs = asyncHandler(async (req, res) => {
  const data = await prisma.purchaseOrder.findMany({
    where: { status: { in: ['PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED'] } },
    include: { supplier: true, items: true },
    orderBy: { orderDate: 'asc' },
  });
  res.json({ data });
});

const supplierPerformance = asyncHandler(async (req, res) => {
  const suppliers = await prisma.supplier.findMany({ include: { purchaseOrders: true } });
  const data = suppliers.map((s) => ({
    supplier: s.name,
    totalOrders: s.purchaseOrders.length,
    totalValue: s.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0),
    cancelledOrders: s.purchaseOrders.filter((po) => po.status === 'CANCELLED').length,
  }));
  res.json({ data });
});

// --- Financial reports (req #31.4) -----------------------------------------

const financialSummary = asyncHandler(async (req, res) => {
  const createdAt = dateRange(req.query);
  const sales = await prisma.sale.findMany({ where: { createdAt, status: { not: 'REVERSED' } }, include: { items: { include: { product: true } } } });

  let revenue = 0, cogs = 0, discounts = 0;
  for (const sale of sales) {
    revenue += Number(sale.total);
    discounts += Number(sale.discount);
    for (const item of sale.items) cogs += item.quantity * Number(item.product.costPrice);
  }
  const returns = await prisma.customerReturn.count({ where: { status: 'COMPLETED' } });
  const outstandingBalances = await prisma.sale.aggregate({ where: { balance: { gt: 0 } }, _sum: { balance: true } });

  res.json({
    revenue,
    costOfGoodsSold: cogs,
    grossProfit: revenue - cogs,
    discounts,
    returnsCount: returns,
    outstandingCustomerBalances: Number(outstandingBalances._sum.balance || 0),
  });
});

module.exports = {
  currentStock,
  stockValuation,
  stockLedger,
  deadStock,
  fastMoving,
  slowMoving,
  salesByPeriod,
  salesByDimension,
  profitByProduct,
  purchaseHistory,
  outstandingPOs,
  supplierPerformance,
  financialSummary,
};
