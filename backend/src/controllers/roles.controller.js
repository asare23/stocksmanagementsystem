const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logAudit } = require('../services/auditService');

const include = { rolePermissions: { include: { permission: true } } };

const list = asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({ include, orderBy: { name: 'asc' } });
  res.json({ data: roles.map((r) => ({ ...r, permissions: r.rolePermissions.map((rp) => rp.permission.code) })) });
});

const create = asyncHandler(async (req, res) => {
  const { name, description, permissionCodes = [] } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const permissions = await prisma.permission.findMany({ where: { code: { in: permissionCodes } } });
  const role = await prisma.role.create({
    data: {
      name,
      description,
      rolePermissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
    },
    include,
  });
  await logAudit({ userId: req.user?.id, action: 'ROLE_CREATE', entityType: 'Role', entityId: role.id, newValue: req.body });
  res.status(201).json(role);
});

const update = asyncHandler(async (req, res) => {
  const before = await prisma.role.findUnique({ where: { id: req.params.id } });
  if (!before) throw new ApiError(404, 'Role not found');
  if (before.isSystem) throw new ApiError(400, 'System roles cannot be modified');

  const { name, description, permissionCodes } = req.body;
  const data = { name, description };
  if (permissionCodes) {
    const permissions = await prisma.permission.findMany({ where: { code: { in: permissionCodes } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: req.params.id } });
    data.rolePermissions = { create: permissions.map((p) => ({ permissionId: p.id })) };
  }
  const role = await prisma.role.update({ where: { id: req.params.id }, data, include });
  await logAudit({ userId: req.user?.id, action: 'ROLE_UPDATE', entityType: 'Role', entityId: role.id, oldValue: before, newValue: req.body });
  res.json(role);
});

const listPermissions = asyncHandler(async (req, res) => {
  const permissions = await prisma.permission.findMany({ orderBy: { code: 'asc' } });
  res.json({ data: permissions });
});

module.exports = { list, create, update, listPermissions };
