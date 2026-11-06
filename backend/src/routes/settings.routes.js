const router = require('express').Router();
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { logAudit } = require('../services/auditService');

router.use(authenticate);

// req #47: company info, currency, tax, numbering, branches, warehouses, payment methods,
// stock valuation method, low-stock threshold, approval rules — stored as flexible key/value pairs.
router.get('/', asyncHandler(async (req, res) => {
  const data = await prisma.systemSetting.findMany();
  res.json({ data });
}));

router.put('/:key', requirePermission('USER_MANAGE'), asyncHandler(async (req, res) => {
  const { value, companyId } = req.body;
  const setting = await prisma.systemSetting.upsert({
    where: { key: req.params.key },
    update: { value },
    create: { key: req.params.key, value, companyId },
  });
  await logAudit({ userId: req.user.id, action: 'SETTING_UPDATE', entityType: 'SystemSetting', entityId: setting.id, newValue: { key: req.params.key, value } });
  res.json(setting);
}));

router.get('/companies', asyncHandler(async (req, res) => {
  const data = await prisma.company.findMany({ include: { branches: true } });
  res.json({ data });
}));

module.exports = router;
