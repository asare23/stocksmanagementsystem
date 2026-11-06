const router = require('express').Router();
const ctrl = require('../controllers/goodsReceipts.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/', requirePermission('STOCK_RECEIVE'), ctrl.list);
router.get('/:id', requirePermission('STOCK_RECEIVE'), ctrl.getOne);
router.post('/', requirePermission('STOCK_RECEIVE'), ctrl.create);
router.post('/:id/confirm', requirePermission('STOCK_RECEIVE'), ctrl.confirm);

module.exports = router;
