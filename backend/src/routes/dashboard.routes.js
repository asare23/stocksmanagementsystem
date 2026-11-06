const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/summary', requirePermission('REPORT_VIEW'), ctrl.summary);
router.get('/sales-trend', requirePermission('REPORT_VIEW'), ctrl.salesTrend);
router.get('/top-products', requirePermission('REPORT_VIEW'), ctrl.topProducts);

module.exports = router;
