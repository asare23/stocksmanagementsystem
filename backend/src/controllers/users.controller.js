const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logAudit } = require('../services/auditService');

const include = { role: true, branch: true };
const safe = (u) => { const { passwordHash, ...rest } = u; return rest; };

const list = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ include, orderBy: { createdAt: 'desc' } });
  res.json({ data: users.map(safe) });
});

const getOne = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, include });
  if (!user) throw new ApiError(404, 'User not found');
  res.json(safe(user));
});

const create = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, roleId, branchId, employeeCode } = req.body;
  if (!fullName || !email || !password || !roleId) {
    throw new ApiError(400, 'fullName, email, password and roleId are required');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { fullName, email, phone, employeeCode, passwordHash, roleId, branchId },
    include,
  });
  await logAudit({ userId: req.user?.id, action: 'USER_CREATE', entityType: 'User', entityId: user.id, newValue: { email, roleId } });
  res.status(201).json(safe(user));
});

const update = asyncHandler(async (req, res) => {
  const { fullName, phone, roleId, branchId, status, employeeCode } = req.body;
  const before = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!before) throw new ApiError(404, 'User not found');
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { fullName, phone, roleId, branchId, status, employeeCode },
    include,
  });
  await logAudit({ userId: req.user?.id, action: 'USER_UPDATE', entityType: 'User', entityId: user.id, oldValue: before, newValue: req.body });
  res.json(safe(user));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw new ApiError(400, 'newPassword must be at least 8 characters');
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash, failedLoginCount: 0, status: 'ACTIVE' } });
  await logAudit({ userId: req.user?.id, action: 'USER_PASSWORD_RESET', entityType: 'User', entityId: req.params.id });
  res.status(204).send();
});

module.exports = { list, getOne, create, update, resetPassword };
