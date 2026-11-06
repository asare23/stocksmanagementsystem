const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { logAudit } = require('../services/auditService');

const MAX_FAILED_ATTEMPTS = 5;

function serializeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    employeeCode: user.employeeCode,
    role: user.role.name,
    branchId: user.branchId,
    permissions: user.role.rolePermissions.map((rp) => rp.permission.code),
  };
}

// req #36: login, password hashing check, account lockout after repeated failures.
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
  });

  if (!user) throw new ApiError(401, 'Invalid credentials');
  if (user.status === 'LOCKED') throw new ApiError(423, 'Account is locked. Contact an administrator.');
  if (user.status !== 'ACTIVE') throw new ApiError(403, 'Account is not active');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockOut = failedLoginCount >= MAX_FAILED_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount, status: lockOut ? 'LOCKED' : user.status },
    });
    if (lockOut) {
      await logAudit({ userId: user.id, action: 'ACCOUNT_LOCKED', entityType: 'User', entityId: user.id });
      throw new ApiError(423, 'Account locked after too many failed attempts');
    }
    throw new ApiError(401, 'Invalid credentials');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lastLoginAt: new Date() },
  });

  await logAudit({ userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id, ipAddress: req.ip });

  res.json({
    user: serializeUser(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, 'refreshToken is required');
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (e) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
  });
  if (!user || user.status !== 'ACTIVE') throw new ApiError(401, 'Account is not active');
  res.json({ accessToken: signAccessToken(user) });
});

const logout = asyncHandler(async (req, res) => {
  await logAudit({ userId: req.user?.id, action: 'LOGOUT', entityType: 'User', entityId: req.user?.id, ipAddress: req.ip });
  res.status(204).send();
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    throw new ApiError(400, 'currentPassword and a newPassword of at least 8 characters are required');
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await logAudit({ userId: user.id, action: 'PASSWORD_CHANGE', entityType: 'User', entityId: user.id });
  res.status(204).send();
});

const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
  });
  res.json(serializeUser(user));
});

module.exports = { login, refresh, logout, changePassword, me };
