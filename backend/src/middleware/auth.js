const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the JWT access token, then loads the user (with role + permissions) fresh
// from the DB on every request. This means a locked/deactivated user or a role/permission
// change takes effect immediately, not only after the token expires.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid Authorization header');
  }
  const token = header.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } }, branch: true },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new ApiError(401, 'Account is not active');
  }

  req.user = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    branchId: user.branchId,
    permissions: user.role.rolePermissions.map((rp) => rp.permission.code),
  };
  next();
});

module.exports = { authenticate };
