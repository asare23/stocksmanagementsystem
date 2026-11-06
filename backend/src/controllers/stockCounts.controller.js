const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { nextCode } = require('../utils/codeGenerator');
const { postStockIn, postStockOut } = require('../services/inventoryService');
const { logAudit } = require('../services/auditService');

const include = { warehouse: true, items: { include: { product: true } } };

const list = asyncHandler(async (req, res) => {
  const data = await prisma.stockCount.findMany({ include, orderBy: { createdAt: 'desc' } });
  res.json({ data });
});

const getOne = asyncHandler(async (req, res) => {
  const count = await prisma.stockCount.findUnique({ where: { id: req.params.id }, include });
  if (!count) throw new ApiError(404, 'Stock count not found');
  res.json(count);
});

// req #21: Create Stock Count -> snapshot System Quantity for every (or selected) product at a warehouse.
const create = asyncHandler(async (req, res) => {
  const { warehouseId, productIds } = req.body;
  if (!warehouseId) throw new ApiError(400, 'warehouseId is required');

  const where = { warehouseId };
  if (productIds?.length) where.productId = { in: productIds };
  const balances = await prisma.inventory.findMany({ where });

  const countNumber = await nextCode('SC', prisma.stockCount);
  const count = await prisma.stockCount.create({
    data: {
      countNumber,
      warehouseId,
      createdById: req.user.id,
      status: 'DRAFT',
      items: { create: balances.map((b) => ({ productId: b.productId, systemQuantity: b.quantityOnHand })) },
    },
    include,
  });
  await logAudit({ userId: req.user.id, action: 'STOCK_COUNT_CREATE', entityType: 'StockCount', entityId: count.id });
  res.status(201).json(count);
});

// Freeze/Lock Count so stock movements against these products can be flagged during counting.
const lock = asyncHandler(async (req, res) => {
  const updated = await prisma.stockCount.update({ where: { id: req.params.id }, data: { status: 'LOCKED' }, include });
  res.json(updated);
});

// Enter Count: record physical quantities and compute the difference.
const enterCounts = asyncHandler(async (req, res) => {
  const { items } = req.body; // [{ productId, physicalQuantity }]
  if (!items?.length) throw new ApiError(400, 'items are required');

  const existing = await prisma.stockCountItem.findMany({ where: { stockCountId: req.params.id } });
  const byProduct = new Map(existing.map((ci) => [ci.productId, ci]));

  await prisma.$transaction(
    items
      .filter((i) => byProduct.has(i.productId))
      .map((i) => {
        const ci = byProduct.get(i.productId);
        return prisma.stockCountItem.update({
          where: { id: ci.id },
          data: { physicalQuantity: i.physicalQuantity, difference: i.physicalQuantity - ci.systemQuantity },
        });
      })
  );

  const updated = await prisma.stockCount.update({ where: { id: req.params.id }, data: { status: 'COUNTING' }, include });
  res.json(updated);
});

// Review -> Approve -> Generate Adjustment: posts every non-zero difference straight to the ledger
// as an ADJUSTMENT_IN/OUT, keeping the count and the resulting adjustment traceable to each other.
const approveAndPost = asyncHandler(async (req, res) => {
  const count = await prisma.stockCount.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!count) throw new ApiError(404, 'Stock count not found');
  if (!['COUNTING', 'REVIEW'].includes(count.status)) {
    throw new ApiError(400, `Cannot approve a stock count in ${count.status} status`);
  }

  const diffs = count.items.filter((i) => i.difference && i.difference !== 0);

  const result = await prisma.$transaction(async (tx) => {
    let adjustment = null;
    if (diffs.length) {
      const adjustmentNumber = await (async () => {
        const c = await tx.stockAdjustment.count();
        return `ADJ-${new Date().getFullYear()}-${String(c + 1).padStart(6, '0')}`;
      })();
      adjustment = await tx.stockAdjustment.create({
        data: {
          adjustmentNumber,
          warehouseId: count.warehouseId,
          reason: 'COUNTING_ERROR',
          status: 'POSTED',
          requestedById: req.user.id,
          approvedById: req.user.id,
          notes: `Generated from stock count ${count.countNumber}`,
          items: { create: diffs.map((d) => ({ productId: d.productId, quantityBefore: d.systemQuantity, quantityAdjusted: d.difference })) },
        },
      });

      for (const d of diffs) {
        if (d.difference > 0) {
          await postStockIn(tx, {
            productId: d.productId,
            warehouseId: count.warehouseId,
            quantity: d.difference,
            txnType: 'ADJUSTMENT_IN',
            reference: adjustment.adjustmentNumber,
            sourceType: 'STOCK_ADJUSTMENT',
            sourceId: adjustment.id,
            userId: req.user.id,
          });
        } else {
          await postStockOut(tx, {
            productId: d.productId,
            warehouseId: count.warehouseId,
            quantity: Math.abs(d.difference),
            txnType: 'ADJUSTMENT_OUT',
            reference: adjustment.adjustmentNumber,
            sourceType: 'STOCK_ADJUSTMENT',
            sourceId: adjustment.id,
            userId: req.user.id,
            allowNegativeStock: true,
          });
        }
      }
    }

    const updatedCount = await tx.stockCount.update({
      where: { id: count.id },
      data: { status: 'COMPLETED' },
      include,
    });

    return { count: updatedCount, adjustment };
  });

  await logAudit({ userId: req.user.id, action: 'STOCK_COUNT_APPROVE', entityType: 'StockCount', entityId: count.id });
  res.json(result);
});

module.exports = { list, getOne, create, lock, enterCounts, approveAndPost };
