const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { nextCode } = require('../utils/codeGenerator');
const { postStockIn, postStockOut } = require('../services/inventoryService');
const { logAudit } = require('../services/auditService');

const include = {
  fromWarehouse: true,
  toWarehouse: true,
  requestedBy: { select: { id: true, fullName: true } },
  items: { include: { product: true } },
};

const list = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const data = await prisma.stockTransfer.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json({ data });
});

const getOne = asyncHandler(async (req, res) => {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id: req.params.id }, include });
  if (!transfer) throw new ApiError(404, 'Stock transfer not found');
  res.json(transfer);
});

// req #14: transfers between warehouses/branches.
const create = asyncHandler(async (req, res) => {
  const { fromWarehouseId, toWarehouseId, items, notes } = req.body;
  if (!fromWarehouseId || !toWarehouseId || !items?.length) {
    throw new ApiError(400, 'fromWarehouseId, toWarehouseId and at least one item are required');
  }
  if (fromWarehouseId === toWarehouseId) throw new ApiError(400, 'Source and destination warehouse must differ');

  const transferNumber = await nextCode('TRF', prisma.stockTransfer);
  const transfer = await prisma.stockTransfer.create({
    data: {
      transferNumber,
      fromWarehouseId,
      toWarehouseId,
      notes,
      status: 'REQUESTED',
      requestedById: req.user.id,
      items: { create: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
    },
    include,
  });
  await logAudit({ userId: req.user.id, action: 'STOCK_TRANSFER_CREATE', entityType: 'StockTransfer', entityId: transfer.id, newValue: req.body });
  res.status(201).json(transfer);
});

const approve = asyncHandler(async (req, res) => {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id: req.params.id } });
  if (!transfer) throw new ApiError(404, 'Stock transfer not found');
  if (transfer.status !== 'REQUESTED') throw new ApiError(400, `Cannot approve a transfer in ${transfer.status} status`);
  const updated = await prisma.stockTransfer.update({
    where: { id: req.params.id },
    data: { status: 'APPROVED', approvedById: req.user.id },
    include,
  });
  await logAudit({ userId: req.user.id, action: 'STOCK_TRANSFER_APPROVE', entityType: 'StockTransfer', entityId: transfer.id });
  res.json(updated);
});

// Dispatch: stock leaves the source warehouse now (TRANSFER_OUT).
const dispatch = asyncHandler(async (req, res) => {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!transfer) throw new ApiError(404, 'Stock transfer not found');
  if (transfer.status !== 'APPROVED') throw new ApiError(400, `Cannot dispatch a transfer in ${transfer.status} status`);

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of transfer.items) {
      await postStockOut(tx, {
        productId: item.productId,
        warehouseId: transfer.fromWarehouseId,
        quantity: item.quantity,
        txnType: 'TRANSFER_OUT',
        reference: transfer.transferNumber,
        sourceType: 'STOCK_TRANSFER',
        sourceId: transfer.id,
        userId: req.user.id,
      });
    }
    return tx.stockTransfer.update({
      where: { id: transfer.id },
      data: { status: 'DISPATCHED', dispatchedAt: new Date() },
      include,
    });
  });
  await logAudit({ userId: req.user.id, action: 'STOCK_TRANSFER_DISPATCH', entityType: 'StockTransfer', entityId: transfer.id });
  res.json(updated);
});

// Receive: stock only lands in the destination warehouse here (req #14).
const receive = asyncHandler(async (req, res) => {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!transfer) throw new ApiError(404, 'Stock transfer not found');
  if (transfer.status !== 'DISPATCHED') throw new ApiError(400, `Cannot receive a transfer in ${transfer.status} status`);

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of transfer.items) {
      await postStockIn(tx, {
        productId: item.productId,
        warehouseId: transfer.toWarehouseId,
        quantity: item.quantity,
        txnType: 'TRANSFER_IN',
        reference: transfer.transferNumber,
        sourceType: 'STOCK_TRANSFER',
        sourceId: transfer.id,
        userId: req.user.id,
      });
    }
    return tx.stockTransfer.update({
      where: { id: transfer.id },
      data: { status: 'COMPLETED', receivedAt: new Date() },
      include,
    });
  });
  await logAudit({ userId: req.user.id, action: 'STOCK_TRANSFER_RECEIVE', entityType: 'StockTransfer', entityId: transfer.id });
  res.json(updated);
});

const cancel = asyncHandler(async (req, res) => {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id: req.params.id } });
  if (!transfer) throw new ApiError(404, 'Stock transfer not found');
  if (!['REQUESTED', 'APPROVED'].includes(transfer.status)) {
    throw new ApiError(400, 'Only requested or approved transfers can be cancelled (stock already dispatched must be reversed instead)');
  }
  const updated = await prisma.stockTransfer.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' }, include });
  await logAudit({ userId: req.user.id, action: 'STOCK_TRANSFER_CANCEL', entityType: 'StockTransfer', entityId: transfer.id });
  res.json(updated);
});

module.exports = { list, getOne, create, approve, dispatch, receive, cancel };
