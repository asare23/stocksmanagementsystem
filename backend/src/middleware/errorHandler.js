const ApiError = require('../utils/ApiError');

// Central error handler. Prisma "known request errors" carry a `.code` (e.g. P2002 unique
// constraint, P2003 FK violation) — translate the common ones to sane HTTP statuses instead
// of leaking a 500 + stack trace for what is really a 400/409 caused by bad input.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details || undefined });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that unique value already exists', fields: err.meta?.target });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Referenced record does not exist', field: err.meta?.field_name });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
};

module.exports = errorHandler;
