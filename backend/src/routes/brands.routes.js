const router = require('express').Router();
const crudFactory = require('../utils/crudFactory');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const ctrl = crudFactory('productBrand', 'ProductBrand', { searchFields: ['name'] });

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', requirePermission('PRODUCT_CREATE'), ctrl.create);
router.put('/:id', requirePermission('PRODUCT_UPDATE'), ctrl.update);
router.delete('/:id', requirePermission('PRODUCT_DELETE'), ctrl.remove);

module.exports = router;
