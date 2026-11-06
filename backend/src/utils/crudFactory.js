const prisma = require('../config/prisma');
const asyncHandler = require('./asyncHandler');
const ApiError = require('./ApiError');
const { logAudit } = require('../services/auditService');

// Builds standard list/get/create/update/delete handlers for a simple Prisma model.
// `modelName` must match the Prisma client property (e.g. 'productCategory').
// `entityType` is the human label used in audit logs.
function crudFactory(modelName, entityType, { include, searchFields = [], orderBy } = {}) {
  const model = prisma[modelName];

  const list = asyncHandler(async (req, res) => {
    const { q, page = 1, pageSize = 50 } = req.query;
    const where = {};
    if (q && searchFields.length) {
      where.OR = searchFields.map((f) => ({ [f]: { contains: q, mode: 'insensitive' } }));
    }
    const take = Math.min(Number(pageSize) || 50, 200);
    const skip = (Number(page) - 1) * take;
    const [data, total] = await Promise.all([
      model.findMany({ where, include, orderBy, skip, take }),
      model.count({ where }),
    ]);
    res.json({ data, total, page: Number(page), pageSize: take });
  });

  const getOne = asyncHandler(async (req, res) => {
    const record = await model.findUnique({ where: { id: req.params.id }, include });
    if (!record) throw new ApiError(404, `${entityType} not found`);
    res.json(record);
  });

  const create = asyncHandler(async (req, res) => {
    const record = await model.create({ data: req.body, include });
    await logAudit({ userId: req.user?.id, action: `${entityType}_CREATE`, entityType, entityId: record.id, newValue: req.body });
    res.status(201).json(record);
  });

  const update = asyncHandler(async (req, res) => {
    const before = await model.findUnique({ where: { id: req.params.id } });
    if (!before) throw new ApiError(404, `${entityType} not found`);
    const record = await model.update({ where: { id: req.params.id }, data: req.body, include });
    await logAudit({ userId: req.user?.id, action: `${entityType}_UPDATE`, entityType, entityId: record.id, oldValue: before, newValue: req.body });
    res.json(record);
  });

  const remove = asyncHandler(async (req, res) => {
    const before = await model.findUnique({ where: { id: req.params.id } });
    if (!before) throw new ApiError(404, `${entityType} not found`);
    await model.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user?.id, action: `${entityType}_DELETE`, entityType, entityId: req.params.id, oldValue: before });
    res.status(204).send();
  });

  return { list, getOne, create, update, remove };
}

module.exports = crudFactory;
