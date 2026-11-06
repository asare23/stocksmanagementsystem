const router = require('express').Router();
const crudFactory = require('../utils/crudFactory');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

const ctrl = crudFactory('warehouse', 'Warehouse', { include: { branch: true, locations: true }, searchFields: ['name', 'code'] });

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', requirePermission('USER_MANAGE'), ctrl.create);
router.put('/:id', requirePermission('USER_MANAGE'), ctrl.update);
router.delete('/:id', requirePermission('USER_MANAGE'), ctrl.remove);

module.exports = router;
