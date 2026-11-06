const router = require('express').Router();
const ctrl = require('../controllers/customerReturns.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/', requirePermission('SALES_RETURN'), ctrl.list);
router.get('/:id', requirePermission('SALES_RETURN'), ctrl.getOne);
router.post('/', requirePermission('SALES_RETURN'), ctrl.create);
router.post('/:id/approve', requirePermission('SALES_RETURN'), ctrl.approve);
router.post('/:id/receive', requirePermission('SALES_RETURN'), ctrl.receive);
router.post('/:id/refund', requirePermission('SALES_RETURN'), ctrl.refund);
router.post('/:id/complete', requirePermission('SALES_RETURN'), ctrl.complete);

module.exports = router;
