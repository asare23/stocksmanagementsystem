const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { nextCode } = require('../utils/codeGenerator');
const { postStockOut } = require('../services/inventoryService');
const { logAudit } = require('../services/auditService');

const include = { supplier: true, items: { include: { product: true } } };

const list = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const data = await prisma.supplierReturn.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json({ data });
});

const getOne = asyncHandler(async (req, res) => {
  const ret = await prisma.supplierReturn.findUnique({ where: { id: req.params.id }, include });
  if (!ret) throw new ApiError(404, 'Supplier return not found');
  res.json(ret);
});

// req #19: return defective/unwanted goods to a supplier; reduces inventory when confirmed.
const create = asyncHandler(async (req, res) => {
  const { supplierId, goodsReceiptId, items, reason } = req.body;
  if (!supplierId || !items?.length) throw new ApiError(400, 'supplierId and at least one item are required');

  const returnNumber = await nextCode('SR', prisma.supplierReturn);
  const ret = await prisma.supplierReturn.create({
    data: {
      returnNumber,
      supplierId,
      goodsReceiptId,
      reason,
      status: 'REQUESTED',
      requestedById: req.user.id,
      items: { create: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
    },
    include,
  });
  await logAudit({ userId: req.user.id, action: 'SUPPLIER_RETURN_CREATE', entityType: 'SupplierReturn', entityId: ret.id, newValue: req.body });
  res.status(201).json(ret);
});

const approve = asyncHandler(async (req, res) => {
  const updated = await prisma.supplierReturn.update({ where: { id: req.params.id }, data: { status: 'APPROVED', approvedById: req.user.id }, include });
  res.json(updated);
});

// Confirming "sent" is when goods physically leave — reduce stock now.
const send = asyncHandler(async (req, res) => {
  const { warehouseId } = req.body;
  if (!warehouseId) throw new ApiError(400, 'warehouseId is required (which warehouse the goods are leaving from)');
  const ret = await prisma.supplierReturn.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!ret) throw new ApiError(404, 'Supplier return not found');
  if (ret.status !== 'APPROVED') throw new ApiError(400, `Cannot send a return in ${ret.status} status`);

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of ret.items) {
      await postStockOut(tx, {
        productId: item.productId,
        warehouseId,
        quantity: item.quantity,
        txnType: 'SUPPLIER_RETURN',
        reference: ret.returnNumber,
        sourceType: 'SUPPLIER_RETURN',
        sourceId: ret.id,
        userId: req.user.id,
      });
    }
    return tx.supplierReturn.update({ where: { id: ret.id }, data: { status: 'COMPLETED' }, include });
  });
  await logAudit({ userId: req.user.id, action: 'SUPPLIER_RETURN_SEND', entityType: 'SupplierReturn', entityId: ret.id });
  res.json(updated);
});

module.exports = { list, getOne, create, approve, send };
