const router = require('express').Router();
const ctrl = require('../controllers/products.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/low-stock', ctrl.lowStock);
router.get('/search-by-vehicle', ctrl.searchByVehicle);
router.get('/barcode/:barcode', ctrl.findByBarcode);
router.get('/:id', ctrl.getOne);
router.get('/:id/price-history', ctrl.priceHistory);
router.post('/', requirePermission('PRODUCT_CREATE'), ctrl.create);
router.put('/:id', requirePermission('PRODUCT_UPDATE'), ctrl.update);
router.delete('/:id', requirePermission('PRODUCT_DELETE'), ctrl.deactivate);

module.exports = router;
