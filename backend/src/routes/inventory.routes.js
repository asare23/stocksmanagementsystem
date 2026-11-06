const router = require('express').Router();
const ctrl = require('../controllers/inventory.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/', requirePermission('STOCK_VIEW'), ctrl.list);
router.get('/:productId', requirePermission('STOCK_VIEW'), ctrl.getByProduct);
router.get('/:productId/movements', requirePermission('STOCK_VIEW'), ctrl.getMovements);

module.exports = router;
