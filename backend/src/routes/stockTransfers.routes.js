const router = require('express').Router();
const ctrl = require('../controllers/stockTransfers.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/', requirePermission('STOCK_TRANSFER'), ctrl.list);
router.get('/:id', requirePermission('STOCK_TRANSFER'), ctrl.getOne);
router.post('/', requirePermission('STOCK_TRANSFER'), ctrl.create);
router.post('/:id/approve', requirePermission('STOCK_TRANSFER'), ctrl.approve);
router.post('/:id/dispatch', requirePermission('STOCK_TRANSFER'), ctrl.dispatch);
router.post('/:id/receive', requirePermission('STOCK_TRANSFER'), ctrl.receive);
router.post('/:id/cancel', requirePermission('STOCK_TRANSFER'), ctrl.cancel);

module.exports = router;
