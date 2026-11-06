const router = require('express').Router();
const ctrl = require('../controllers/stockCounts.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/', requirePermission('STOCK_VIEW'), ctrl.list);
router.get('/:id', requirePermission('STOCK_VIEW'), ctrl.getOne);
router.post('/', requirePermission('STOCK_ADJUST'), ctrl.create);
router.post('/:id/lock', requirePermission('STOCK_ADJUST'), ctrl.lock);
router.post('/:id/enter-counts', requirePermission('STOCK_ADJUST'), ctrl.enterCounts);
router.post('/:id/approve', requirePermission('STOCK_ADJUST'), ctrl.approveAndPost);

module.exports = router;
