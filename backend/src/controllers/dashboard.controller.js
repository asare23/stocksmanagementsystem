const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// req #30: Total Products, Total Stock Units, Inventory Value, Today's Sales, Today's Purchases,
// Low Stock, Out of Stock, Pending POs.
const summary = asyncHandler(async (req, res) => {
  const today = startOfToday();

  const [totalProducts, inventoryRows, todaysSales, todaysPurchases, pendingPOs] = await Promise.all([
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.inventory.findMany({ include: { product: true } }),
    prisma.sale.aggregate({ where: { createdAt: { gte: today }, status: { not: 'REVERSED' } }, _sum: { total: true }, _count: true }),
    prisma.goodsReceipt.aggregate({ where: { createdAt: { gte: today }, status: 'CONFIRMED' }, _count: true }),
    prisma.purchaseOrder.count({ where: { status: { in: ['PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED'] } } }),
  ]);

  const totalStockUnits = inventoryRows.reduce((s, i) => s + i.quantityOnHand, 0);
  const inventoryValue = inventoryRows.reduce((s, i) => s + i.quantityOnHand * Number(i.product.costPrice || 0), 0);
  const lowStockItems = inventoryRows.filter((i) => i.quantityOnHand - i.quantityReserved <= i.product.reorderLevel && i.quantityOnHand > 0).length;
  const outOfStockItems = inventoryRows.filter((i) => i.quantityOnHand <= 0).length;

  res.json({
    totalProducts,
    totalStockUnits,
    inventoryValue,
    todaysSales: Number(todaysSales._sum.total || 0),
    todaysSalesCount: todaysSales._count,
    todaysPurchases: todaysPurchases._count,
    lowStockItems,
    outOfStockItems,
    pendingPurchaseOrders: pendingPOs,
  });
});

// Chart data: sales over the last N days, top-selling products.
const salesTrend = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 14;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: since }, status: { not: 'REVERSED' } },
    select: { createdAt: true, total: true },
  });
  const byDay = {};
  for (const s of sales) {
    const day = s.createdAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + Number(s.total);
  }
  res.json({ data: Object.entries(byDay).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date)) });
});

const topProducts = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const grouped = await prisma.saleItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });
  const products = await prisma.product.findMany({ where: { id: { in: grouped.map((g) => g.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));
  res.json({
    data: grouped.map((g) => ({
      product: productMap.get(g.productId),
      quantitySold: g._sum.quantity,
      revenue: Number(g._sum.lineTotal),
    })),
  });
});

module.exports = { summary, salesTrend, topProducts };
