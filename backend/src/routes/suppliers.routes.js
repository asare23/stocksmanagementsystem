const router = require('express').Router();
const crudFactory = require('../utils/crudFactory');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const ctrl = crudFactory('supplier', 'Supplier', { searchFields: ['name', 'code', 'phone', 'email'] });

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', requirePermission('PURCHASE_CREATE'), ctrl.create);
router.put('/:id', requirePermission('PURCHASE_CREATE'), ctrl.update);
router.delete('/:id', requirePermission('USER_MANAGE'), ctrl.remove);

module.exports = router;
