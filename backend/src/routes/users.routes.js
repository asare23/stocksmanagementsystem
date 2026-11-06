const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate);
router.get('/', requirePermission('USER_MANAGE'), ctrl.list);
router.get('/:id', requirePermission('USER_MANAGE'), ctrl.getOne);
router.post('/', requirePermission('USER_MANAGE'), ctrl.create);
router.put('/:id', requirePermission('USER_MANAGE'), ctrl.update);
router.post('/:id/reset-password', requirePermission('USER_MANAGE'), ctrl.resetPassword);

module.exports = router;
