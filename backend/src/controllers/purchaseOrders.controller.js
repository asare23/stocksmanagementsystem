const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { nextCode } = require('../utils/codeGenerator');
const { logAudit } = require('../services/auditService');

const include = {
  supplier: true,
  warehouse: true,
  requestedBy: { select: { id: true, fullName: true } },
  items: { include: { product: true } },
};

const list = asyncHandler(async (req, res) => {
  const { status, supplierId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (supplierId) where.supplierId = supplierId;
  const data = await prisma.purchaseOrder.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json({ data });
});

const getOne = asyncHandler(async (req, res) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id }, include });
  if (!po) throw new ApiError(404, 'Purchase order not found');
  res.json(po);
});

// req #8: PO Number, Supplier, Date, Warehouse, Products, Qty ordered, Unit cost, Total.
const create = asyncHandler(async (req, res) => {
  const { supplierId, warehouseId, items, notes } = req.body;
  if (!supplierId || !warehouseId || !items?.length) {
    throw new ApiError(400, 'supplierId, warehouseId and at least one item are required');
  }

  const lineItems = items.map((i) => ({
    productId: i.productId,
    quantityOrdered: i.quantity,
    unitCost: i.unitCost,
    lineTotal: i.quantity * i.unitCost,
  }));
  const totalAmount = lineItems.reduce((s, i) => s + i.lineTotal, 0);
  const poNumber = await nextCode('PO', prisma.purchaseOrder);

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId,
      warehouseId,
      notes,
      totalAmount,
      requestedById: req.user.id,
      items: { create: lineItems },
    },
    include,
  });
  await logAudit({ userId: req.user.id, action: 'PURCHASE_ORDER_CREATE', entityType: 'PurchaseOrder', entityId: po.id, newValue: req.body });
  res.status(201).json(po);
});

const ALLOWED_TRANSITIONS = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'CANCELLED'],
  APPROVED: ['PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['FULLY_RECEIVED', 'CANCELLED'],
  FULLY_RECEIVED: ['CLOSED'],
};

async function transition(req, res, newStatus, { requirePerm } = {}) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
  if (!po) throw new ApiError(404, 'Purchase order not found');
  const allowed = ALLOWED_TRANSITIONS[po.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(400, `Cannot move purchase order from ${po.status} to ${newStatus}`);
  }
  const updated = await prisma.purchaseOrder.update({
    where: { id: req.params.id },
    data: { status: newStatus, approvedById: newStatus === 'APPROVED' ? req.user.id : po.approvedById },
    include,
  });
  await logAudit({ userId: req.user.id, action: `PURCHASE_ORDER_${newStatus}`, entityType: 'PurchaseOrder', entityId: po.id, oldValue: { status: po.status }, newValue: { status: newStatus } });
  res.json(updated);
}

const submit = asyncHandler(async (req, res) => transition(req, res, 'PENDING_APPROVAL'));
// req #34: purchase orders require authorization — gated by PURCHASE_APPROVE permission at the route level.
const approve = asyncHandler(async (req, res) => transition(req, res, 'APPROVED'));
const cancel = asyncHandler(async (req, res) => transition(req, res, 'CANCELLED'));
const close = asyncHandler(async (req, res) => transition(req, res, 'CLOSED'));

module.exports = { list, getOne, create, submit, approve, cancel, close };
