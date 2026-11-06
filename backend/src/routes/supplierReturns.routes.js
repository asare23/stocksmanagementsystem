const router = require('express').Router();
const ctrl = require('../controllers/supplierReturns.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/', requirePermission('PURCHASE_CREATE'), ctrl.list);
router.get('/:id', requirePermission('PURCHASE_CREATE'), ctrl.getOne);
router.post('/', requirePermission('PURCHASE_CREATE'), ctrl.create);
router.post('/:id/approve', requirePermission('PURCHASE_APPROVE'), ctrl.approve);
router.post('/:id/send', requirePermission('PURCHASE_APPROVE'), ctrl.send);

module.exports = router;
