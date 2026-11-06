const prisma = require('../config/prisma');

// req #32: every important action recorded with user, action, reference, old/new value, timestamp.
async function logAudit({ userId, action, entityType, entityId, oldValue, newValue, ipAddress }, tx = prisma) {
  return tx.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      ipAddress,
    },
  });
}

module.exports = { logAudit };
