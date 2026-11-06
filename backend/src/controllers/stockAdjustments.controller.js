const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { nextCode } = require('../utils/codeGenerator');
const { postStockIn, postStockOut, reverseTransaction } = require('../services/inventoryService');
const { logAudit } = require('../services/auditService');

const include = {
  warehouse: true,
  requestedBy: { select: { id: true, fullName: true } },
  items: { include: { product: true } },
};

const list = asyncHandler(async (req, res) => {
  const { status, warehouseId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (warehouseId) where.warehouseId = warehouseId;
  const data = await prisma.stockAdjustment.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json({ data });
});

const getOne = asyncHandler(async (req, res) => {
  const adj = await prisma.stockAdjustment.findUnique({ where: { id: req.params.id }, include });
  if (!adj) throw new ApiError(404, 'Stock adjustment not found');
  res.json(adj);
});

// req #20: authorized adjustments where physical stock differs from system stock.
const create = asyncHandler(async (req, res) => {
  const { warehouseId, reason, items, notes } = req.body;
  if (!warehouseId || !reason || !items?.length) {
    throw new ApiError(400, 'warehouseId, reason and at least one item are required');
  }

  const withBefore = [];
  for (const i of items) {
    const inv = await prisma.inventory.findFirst({ where: { productId: i.productId, warehouseId } });
    withBefore.push({ productId: i.productId, quantityBefore: inv?.quantityOnHand ?? 0, quantityAdjusted: i.quantity });
  }

  const adjustmentNumber = await nextCode('ADJ', prisma.stockAdjustment);
  const adj = await prisma.stockAdjustment.create({
    data: {
      adjustmentNumber,
      warehouseId,
      reason,
      notes,
      status: 'PENDING_APPROVAL',
      requestedById: req.user.id,
      items: { create: withBefore },
    },
    include,
  });
  await logAudit({ userId: req.user.id, action: 'STOCK_ADJUSTMENT_CREATE', entityType: 'StockAdjustment', entityId: adj.id, newValue: req.body });
  res.status(201).json(adj);
});

// req #34: adjustments require authorization. Approving here also posts to the ledger immediately,
// which keeps the flow simple; swap to a separate /post step if a two-stage approval is needed.
const approve = asyncHandler(async (req, res) => {
  const adj = await prisma.stockAdjustment.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!adj) throw new ApiError(404, 'Stock adjustment not found');
  if (adj.status !== 'PENDING_APPROVAL') throw new ApiError(400, `Cannot approve an adjustment in ${adj.status} status`);

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of adj.items) {
      if (item.quantityAdjusted > 0) {
        await postStockIn(tx, {
          productId: item.productId,
          warehouseId: adj.warehouseId,
          quantity: item.quantityAdjusted,
          txnType: 'ADJUSTMENT_IN',
          reference: adj.adjustmentNumber,
          sourceType: 'STOCK_ADJUSTMENT',
          sourceId: adj.id,
          userId: req.user.id,
        });
      } else if (item.quantityAdjusted < 0) {
        await postStockOut(tx, {
          productId: item.productId,
          warehouseId: adj.warehouseId,
          quantity: Math.abs(item.quantityAdjusted),
          txnType: 'ADJUSTMENT_OUT',
          reference: adj.adjustmentNumber,
          sourceType: 'STOCK_ADJUSTMENT',
          sourceId: adj.id,
          userId: req.user.id,
          allowNegativeStock: true, // adjustments correct the system to match a physical count
        });
      }
    }
    return tx.stockAdjustment.update({
      where: { id: adj.id },
      data: { status: 'POSTED', approvedById: req.user.id },
      include,
    });
  });
  await logAudit({ userId: req.user.id, action: 'STOCK_ADJUSTMENT_APPROVE', entityType: 'StockAdjustment', entityId: adj.id });
  res.json(updated);
});

const reject = asyncHandler(async (req, res) => {
  const adj = await prisma.stockAdjustment.findUnique({ where: { id: req.params.id } });
  if (!adj) throw new ApiError(404, 'Stock adjustment not found');
  if (adj.status !== 'PENDING_APPROVAL') throw new ApiError(400, `Cannot reject an adjustment in ${adj.status} status`);
  const updated = await prisma.stockAdjustment.update({ where: { id: req.params.id }, data: { status: 'REJECTED', approvedById: req.user.id }, include });
  await logAudit({ userId: req.user.id, action: 'STOCK_ADJUSTMENT_REJECT', entityType: 'StockAdjustment', entityId: adj.id });
  res.json(updated);
});

// req #33: controlled reversal that restores inventory rather than deleting the record.
const reverse = asyncHandler(async (req, res) => {
  const adj = await prisma.stockAdjustment.findUnique({ where: { id: req.params.id } });
  if (!adj) throw new ApiError(404, 'Stock adjustment not found');
  if (adj.status !== 'POSTED') throw new ApiError(400, 'Only posted adjustments can be reversed');

  const txns = await prisma.inventoryTransaction.findMany({ where: { sourceType: 'STOCK_ADJUSTMENT', sourceId: adj.id } });
  await prisma.$transaction(async (tx) => {
    for (const t of txns) {
      await reverseTransaction(tx, { originalTxnId: t.id, userId: req.user.id, reference: `REVERSAL-${adj.adjustmentNumber}` });
    }
    await tx.stockAdjustment.update({ where: { id: adj.id }, data: { status: 'REVERSED' } });
  });
  await logAudit({ userId: req.user.id, action: 'STOCK_ADJUSTMENT_REVERSE', entityType: 'StockAdjustment', entityId: adj.id });
  res.status(204).send();
});

module.exports = { list, getOne, create, approve, reject, reverse };
