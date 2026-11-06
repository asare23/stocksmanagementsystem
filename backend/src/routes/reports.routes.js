const router = require('express').Router();
const ctrl = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

router.use(authenticate, requirePermission('REPORT_VIEW'));

router.get('/inventory/current-stock', ctrl.currentStock);
router.get('/inventory/valuation', ctrl.stockValuation);
router.get('/inventory/ledger', ctrl.stockLedger);
router.get('/inventory/dead-stock', ctrl.deadStock);
router.get('/inventory/fast-moving', ctrl.fastMoving);
router.get('/inventory/slow-moving', ctrl.slowMoving);

router.get('/sales/by-period', ctrl.salesByPeriod);
router.get('/sales/by-dimension', ctrl.salesByDimension);
router.get('/sales/profit-by-product', ctrl.profitByProduct);

router.get('/purchases/history', ctrl.purchaseHistory);
router.get('/purchases/outstanding', ctrl.outstandingPOs);
router.get('/purchases/supplier-performance', ctrl.supplierPerformance);

router.get('/financial/summary', ctrl.financialSummary);

module.exports = router;
