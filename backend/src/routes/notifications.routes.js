const router = require('express').Router();
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const data = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ data });
}));

router.post('/:id/read', asyncHandler(async (req, res) => {
  const notification = await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json(notification);
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
  res.status(204).send();
}));

module.exports = router;
