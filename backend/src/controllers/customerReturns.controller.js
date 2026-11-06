const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { nextCode } = require('../utils/codeGenerator');
const { postStockIn } = require('../services/inventoryService');
const { logAudit } = require('../services/auditService');

const include = { sale: true, customer: true, items: { include: { product: true } } };

const list = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const data = await prisma.customerReturn.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json({ data });
});

const getOne = asyncHandler(async (req, res) => {
  const ret = await prisma.customerReturn.findUnique({ where: { id: req.params.id }, include });
  if (!ret) throw new ApiError(404, 'Customer return not found');
  res.json(ret);
});

// req #18: linked to the original invoice, tracks reason, condition, stock and refund impact.
const create = asyncHandler(async (req, res) => {
  const { saleId, customerId, items, reason } = req.body;
  if (!saleId || !items?.length) throw new ApiError(400, 'saleId and at least one item are required');

  const returnNumber = await nextCode('CR', prisma.customerReturn);
  const ret = await prisma.customerReturn.create({
    data: {
      returnNumber,
      saleId,
      customerId,
      reason,
      status: 'REQUESTED',
      requestedById: req.user.id,
      items: { create: items.map((i) => ({ saleItemId: i.saleItemId, productId: i.productId, quantity: i.quantity, condition: i.condition || 'RESALABLE' })) },
    },
    include,
  });
  await logAudit({ userId: req.user.id, action: 'CUSTOMER_RETURN_CREATE', entityType: 'CustomerReturn', entityId: ret.id, newValue: req.body });
  res.status(201).json(ret);
});

const approve = asyncHandler(async (req, res) => {
  const ret = await prisma.customerReturn.findUnique({ where: { id: req.params.id } });
  if (!ret) throw new ApiError(404, 'Customer return not found');
  if (ret.status !== 'REQUESTED') throw new ApiError(400, `Cannot approve a return in ${ret.status} status`);
  const updated = await prisma.customerReturn.update({ where: { id: req.params.id }, data: { status: 'APPROVED', approvedById: req.user.id }, include });
  await logAudit({ userId: req.user.id, action: 'CUSTOMER_RETURN_APPROVE', entityType: 'CustomerReturn', entityId: ret.id });
  res.json(updated);
});

// Goods physically back in hand -> only resalable-condition items go back into sellable stock.
const receive = asyncHandler(async (req, res) => {
  const ret = await prisma.customerReturn.findUnique({ where: { id: req.params.id }, include: { items: true, sale: true } });
  if (!ret) throw new ApiError(404, 'Customer return not found');
  if (ret.status !== 'APPROVED') throw new ApiError(400, `Cannot receive a return in ${ret.status} status`);

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of ret.items) {
      if (item.condition !== 'DAMAGED') {
        await postStockIn(tx, {
          productId: item.productId,
          warehouseId: ret.sale.warehouseId,
          quantity: item.quantity,
          txnType: 'CUSTOMER_RETURN',
          reference: ret.returnNumber,
          sourceType: 'CUSTOMER_RETURN',
          sourceId: ret.id,
          userId: req.user.id,
        });
      }
    }
    return tx.customerReturn.update({ where: { id: ret.id }, data: { status: 'RECEIVED' }, include });
  });
  await logAudit({ userId: req.user.id, action: 'CUSTOMER_RETURN_RECEIVE', entityType: 'CustomerReturn', entityId: ret.id });
  res.json(updated);
});

// Refund/payment impact — reduces the linked sale's amountPaid/balance rather than editing history.
const refund = asyncHandler(async (req, res) => {
  const { amount, method = 'CASH' } = req.body;
  const ret = await prisma.customerReturn.findUnique({ where: { id: req.params.id }, include: { sale: true } });
  if (!ret) throw new ApiError(404, 'Customer return not found');
  if (ret.status !== 'RECEIVED') throw new ApiError(400, `Cannot refund a return in ${ret.status} status`);

  const updated = await prisma.$transaction(async (tx) => {
    if (amount) {
      await tx.payment.create({ data: { saleId: ret.saleId, method, amount: -Math.abs(amount), reference: `REFUND-${ret.returnNumber}`, receivedById: req.user.id } });
      const newAmountPaid = Number(ret.sale.amountPaid) - Math.abs(amount);
      await tx.sale.update({ where: { id: ret.saleId }, data: { amountPaid: newAmountPaid, balance: Number(ret.sale.total) - newAmountPaid } });
    }
    return tx.customerReturn.update({ where: { id: ret.id }, data: { status: 'REFUNDED' }, include });
  });
  await logAudit({ userId: req.user.id, action: 'CUSTOMER_RETURN_REFUND', entityType: 'CustomerReturn', entityId: ret.id, newValue: { amount } });
  res.json(updated);
});

const complete = asyncHandler(async (req, res) => {
  const updated = await prisma.customerReturn.update({ where: { id: req.params.id }, data: { status: 'COMPLETED' }, include });
  res.json(updated);
});

module.exports = { list, getOne, create, approve, receive, refund, complete };
