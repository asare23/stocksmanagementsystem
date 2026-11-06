const ApiError = require('../utils/ApiError');

// Granular permission check (req #37), layered on top of role-based auth.
// SUPER_ADMIN always passes, mirroring req #2.1 "Full access".
const requirePermission = (...codes) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Not authenticated'));
  if (req.user.roleName === 'SUPER_ADMIN') return next();

  const hasAll = codes.every((code) => req.user.permissions.includes(code));
  if (!hasAll) {
    return next(new ApiError(403, `Missing required permission: ${codes.join(', ')}`));
  }
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Not authenticated'));
  if (req.user.roleName === 'SUPER_ADMIN') return next();
  if (!roles.includes(req.user.roleName)) {
    return next(new ApiError(403, `Requires one of roles: ${roles.join(', ')}`));
  }
  next();
};

module.exports = { requirePermission, requireRole };
