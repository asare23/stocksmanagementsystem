const router = require('express').Router();
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate, requirePermission('REPORT_VIEW'));

router.get('/', asyncHandler(async (req, res) => {
  const { userId, action, entityType, from, to } = req.query;
  const where = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  const data = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json({ data });
}));

module.exports = router;
