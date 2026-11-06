const router = require('express').Router();
const ctrl = require('../controllers/sales.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/', requirePermission('SALES_CREATE'), ctrl.list);
router.get('/:id', requirePermission('SALES_CREATE'), ctrl.getOne);
router.post('/', requirePermission('SALES_CREATE'), ctrl.create);
router.post('/:id/payments', requirePermission('SALES_CREATE'), ctrl.addPayment);
router.post('/:id/reverse', requirePermission('SALES_CANCEL'), ctrl.reverse);

module.exports = router;
