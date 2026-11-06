// Generates simple sequential-looking business reference codes (PO-2026-000123 etc).
// In production under real concurrency you'd back this with a DB sequence; a Prisma
// transaction with a per-type counter row (or Postgres SEQUENCE) is the recommended upgrade.
const prisma = require('../config/prisma');

async function nextCode(prefix, model, field) {
  const year = new Date().getFullYear();
  const count = await model.count();
  const seq = String(count + 1).padStart(6, '0');
  return `${prefix}-${year}-${seq}`;
}

module.exports = { nextCode };
