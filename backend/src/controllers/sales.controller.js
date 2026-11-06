const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { nextCode } = require('../utils/codeGenerator');
const { postStockOut, reverseTransaction } = require('../services/inventoryService');
const { logAudit } = require('../services/auditService');

const include = {
  customer: true,
  branch: true,
  warehouse: true,
  salesPerson: { select: { id: true, fullName: true } },
  items: { include: { product: true } },
  payments: true,
};

const list = asyncHandler(async (req, res) => {
  const { status, customerId, branchId, from, to } = req.query;
  const where = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (branchId) where.branchId = branchId;
  if (from || to) {
    where.saleDate = {};
    if (from) where.saleDate.gte = new Date(from);
    if (to) where.saleDate.lte = new Date(to);
  }
  const data = await prisma.sale.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json({ data });
});

const getOne = asyncHandler(async (req, res) => {
  const sale = await prisma.sale.findUnique({ where: { id: req.params.id }, include });
  if (!sale) throw new ApiError(404, 'Sale not found');
  res.json(sale);
});

function paymentStatusFor(total, amountPaid) {
  if (amountPaid <= 0) return 'UNPAID';
  if (amountPaid < total) return 'PARTIALLY_PAID';
  if (amountPaid === total) return 'PAID';
  return 'OVERPAID';
}

// req #15, #16, #43: Customer -> Sales Order/POS -> Invoice -> Payment -> Stock Out, all atomic (req #48.3).
const create = asyncHandler(async (req, res) => {
  const { customerId, branchId, warehouseId, items, payments = [] } = req.body;
  if (!branchId || !warehouseId || !items?.length) {
    throw new ApiError(400, 'branchId, warehouseId and at least one item are required');
  }

  const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lineItems = items.map((i) => {
    const product = productMap.get(i.productId);
    if (!product) throw new ApiError(400, `Unknown product ${i.productId}`);
    const unitPrice = i.unitPrice ?? Number(product.sellingPrice);
    const discount = i.discount || 0;
    const tax = i.tax || 0;
    const lineTotal = i.quantity * unitPrice - discount + tax;
    return { productId: i.productId, quantity: i.quantity, unitPrice, discount, tax, lineTotal, allowNegativeStock: product.allowNegativeStock };
  });

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountTotal = lineItems.reduce((s, i) => s + i.discount, 0);
  const taxTotal = lineItems.reduce((s, i) => s + i.tax, 0);
  const total = subtotal - discountTotal + taxTotal;
  const amountPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = total - amountPaid;

  const invoiceNumber = await nextCode('INV', prisma.sale);

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        invoiceNumber,
        customerId,
        branchId,
        warehouseId,
        salesPersonId: req.user.id,
        status: 'COMPLETED',
        paymentStatus: paymentStatusFor(total, amountPaid),
        subtotal,
        discount: discountTotal,
        tax: taxTotal,
        total,
        amountPaid,
        balance,
        items: { create: lineItems.map(({ allowNegativeStock, ...rest }) => rest) },
        payments: { create: payments.map((p, idx) => ({ reference: p.reference || `${invoiceNumber}-${p.method}-${idx + 1}`, method: p.method, amount: p.amount, receivedById: req.user.id })) },
      },
    });

    for (const item of lineItems) {
      await postStockOut(tx, {
        productId: item.productId,
        warehouseId,
        quantity: item.quantity,
        txnType: 'SALE',
        reference: invoiceNumber,
        sourceType: 'SALE',
        sourceId: created.id,
        userId: req.user.id,
        allowNegativeStock: item.allowNegativeStock,
      });
    }

    return tx.sale.findUnique({ where: { id: created.id }, include });
  });

  await logAudit({ userId: req.user.id, action: 'SALE_CREATE', entityType: 'Sale', entityId: sale.id, newValue: { invoiceNumber, total } });
  res.status(201).json(sale);
});

// Record an additional payment against a partially-paid sale.
const addPayment = asyncHandler(async (req, res) => {
  const { method, amount, reference } = req.body;
  if (!method || !amount) throw new ApiError(400, 'method and amount are required');
  const sale = await prisma.sale.findUnique({ where: { id: req.params.id } });
  if (!sale) throw new ApiError(404, 'Sale not found');

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.create({ data: { saleId: sale.id, method, amount, reference: reference || `${sale.invoiceNumber}-${Date.now()}`, receivedById: req.user.id } });
    const newAmountPaid = Number(sale.amountPaid) + Number(amount);
    return tx.sale.update({
      where: { id: sale.id },
      data: { amountPaid: newAmountPaid, balance: Number(sale.total) - newAmountPaid, paymentStatus: paymentStatusFor(Number(sale.total), newAmountPaid) },
      include,
    });
  });
  await logAudit({ userId: req.user.id, action: 'PAYMENT_RECORD', entityType: 'Sale', entityId: sale.id, newValue: { method, amount } });
  res.json(updated);
});

// req #33: reverse a completed sale — restores inventory and marks the sale REVERSED without deleting it.
const reverse = asyncHandler(async (req, res) => {
  const sale = await prisma.sale.findUnique({ where: { id: req.params.id } });
  if (!sale) throw new ApiError(404, 'Sale not found');
  if (sale.status === 'REVERSED') throw new ApiError(400, 'Sale is already reversed');

  const txns = await prisma.inventoryTransaction.findMany({ where: { sourceType: 'SALE', sourceId: sale.id } });
  const updated = await prisma.$transaction(async (tx) => {
    for (const t of txns) {
      await reverseTransaction(tx, { originalTxnId: t.id, userId: req.user.id, reference: `REVERSAL-${sale.invoiceNumber}` });
    }
    return tx.sale.update({ where: { id: sale.id }, data: { status: 'REVERSED' }, include });
  });
  await logAudit({ userId: req.user.id, action: 'SALE_REVERSE', entityType: 'Sale', entityId: sale.id });
  res.json(updated);
});

module.exports = { list, getOne, create, addPayment, reverse };
