const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { nextCode } = require('../utils/codeGenerator');
const { postStockIn } = require('../services/inventoryService');
const { logAudit } = require('../services/auditService');

const include = {
  supplier: true,
  warehouse: true,
  purchaseOrder: true,
  receivedBy: { select: { id: true, fullName: true } },
  items: { include: { product: true } },
};

const list = asyncHandler(async (req, res) => {
  const { status, warehouseId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (warehouseId) where.warehouseId = warehouseId;
  const data = await prisma.goodsReceipt.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json({ data });
});

const getOne = asyncHandler(async (req, res) => {
  const grn = await prisma.goodsReceipt.findUnique({ where: { id: req.params.id }, include });
  if (!grn) throw new ApiError(404, 'Goods receipt not found');
  res.json(grn);
});

// req #9: create a DRAFT GRN referencing a PO (or standalone). Stock is NOT touched yet.
const create = asyncHandler(async (req, res) => {
  const { purchaseOrderId, supplierId, warehouseId, items } = req.body;
  if (!supplierId || !warehouseId || !items?.length) {
    throw new ApiError(400, 'supplierId, warehouseId and at least one item are required');
  }
  const grnNumber = await nextCode('GRN', prisma.goodsReceipt);

  const grn = await prisma.goodsReceipt.create({
    data: {
      grnNumber,
      purchaseOrderId,
      supplierId,
      warehouseId,
      receivedById: req.user.id,
      items: {
        create: items.map((i) => ({
          purchaseOrderItemId: i.purchaseOrderItemId,
          productId: i.productId,
          quantityReceived: i.quantityReceived,
          unitCost: i.unitCost,
          batchNumber: i.batchNumber,
          serialNumbers: i.serialNumbers,
          expiryDate: i.expiryDate ? new Date(i.expiryDate) : undefined,
        })),
      },
    },
    include,
  });
  await logAudit({ userId: req.user.id, action: 'GOODS_RECEIPT_CREATE', entityType: 'GoodsReceipt', entityId: grn.id, newValue: req.body });
  res.status(201).json(grn);
});

// req #9 "Stock should increase only after the goods receipt is confirmed."
// This is the single place stock enters the system from purchasing, and it is fully atomic:
// inventory update + ledger row + PO progress update + GRN status all commit together.
const confirm = asyncHandler(async (req, res) => {
  const grn = await prisma.goodsReceipt.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!grn) throw new ApiError(404, 'Goods receipt not found');
  if (grn.status !== 'DRAFT') throw new ApiError(400, `Goods receipt is already ${grn.status}`);

  const result = await prisma.$transaction(async (tx) => {
    for (const item of grn.items) {
      await postStockIn(tx, {
        productId: item.productId,
        warehouseId: grn.warehouseId,
        quantity: item.quantityReceived,
        txnType: 'PURCHASE',
        reference: grn.grnNumber,
        sourceType: 'GOODS_RECEIPT',
        sourceId: grn.id,
        unitCost: item.unitCost,
        userId: req.user.id,
        goodsReceiptId: grn.id,
      });

      if (item.purchaseOrderItemId) {
        await tx.purchaseOrderItem.update({
          where: { id: item.purchaseOrderItemId },
          data: { quantityReceived: { increment: item.quantityReceived } },
        });
      }
    }

    const updatedGrn = await tx.goodsReceipt.update({
      where: { id: grn.id },
      data: { status: 'CONFIRMED', approvedById: req.user.id },
      include,
    });

    if (grn.purchaseOrderId) {
      const poItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: grn.purchaseOrderId } });
      const fullyReceived = poItems.every((i) => i.quantityReceived >= i.quantityOrdered);
      const partiallyReceived = poItems.some((i) => i.quantityReceived > 0);
      await tx.purchaseOrder.update({
        where: { id: grn.purchaseOrderId },
        data: { status: fullyReceived ? 'FULLY_RECEIVED' : partiallyReceived ? 'PARTIALLY_RECEIVED' : undefined },
      });
    }

    return updatedGrn;
  });

  await logAudit({ userId: req.user.id, action: 'GOODS_RECEIPT_CONFIRM', entityType: 'GoodsReceipt', entityId: grn.id });
  res.json(result);
});

module.exports = { list, getOne, create, confirm };
