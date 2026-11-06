const router = require('express').Router();
const ctrl = require('../controllers/roles.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/', requirePermission('USER_MANAGE'), ctrl.list);
router.get('/permissions', requirePermission('USER_MANAGE'), ctrl.listPermissions);
router.post('/', requirePermission('USER_MANAGE'), ctrl.create);
router.put('/:id', requirePermission('USER_MANAGE'), ctrl.update);

module.exports = router;
