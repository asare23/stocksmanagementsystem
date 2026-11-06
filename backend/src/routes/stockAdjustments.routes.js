const router = require('express').Router();
const ctrl = require('../controllers/stockAdjustments.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/', requirePermission('STOCK_ADJUST'), ctrl.list);
router.get('/:id', requirePermission('STOCK_ADJUST'), ctrl.getOne);
router.post('/', requirePermission('STOCK_ADJUST'), ctrl.create);
router.post('/:id/approve', requirePermission('STOCK_ADJUST'), ctrl.approve);
router.post('/:id/reject', requirePermission('STOCK_ADJUST'), ctrl.reject);
router.post('/:id/reverse', requirePermission('STOCK_ADJUST'), ctrl.reverse);

module.exports = router;
