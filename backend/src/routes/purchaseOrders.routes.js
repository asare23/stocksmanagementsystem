const router = require('express').Router();
const ctrl = require('../controllers/purchaseOrders.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/', requirePermission('PURCHASE_CREATE'), ctrl.list);
router.get('/:id', requirePermission('PURCHASE_CREATE'), ctrl.getOne);
router.post('/', requirePermission('PURCHASE_CREATE'), ctrl.create);
router.post('/:id/submit', requirePermission('PURCHASE_CREATE'), ctrl.submit);
router.post('/:id/approve', requirePermission('PURCHASE_APPROVE'), ctrl.approve);
router.post('/:id/cancel', requirePermission('PURCHASE_APPROVE'), ctrl.cancel);
router.post('/:id/close', requirePermission('PURCHASE_APPROVE'), ctrl.close);

module.exports = router;
