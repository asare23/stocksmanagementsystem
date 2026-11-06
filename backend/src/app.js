require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const roleRoutes = require('./routes/roles.routes');
const branchRoutes = require('./routes/branches.routes');
const warehouseRoutes = require('./routes/warehouses.routes');
const categoryRoutes = require('./routes/categories.routes');
const brandRoutes = require('./routes/brands.routes');
const productRoutes = require('./routes/products.routes');
const supplierRoutes = require('./routes/suppliers.routes');
const customerRoutes = require('./routes/customers.routes');
const purchaseOrderRoutes = require('./routes/purchaseOrders.routes');
const goodsReceiptRoutes = require('./routes/goodsReceipts.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const stockTransferRoutes = require('./routes/stockTransfers.routes');
const stockAdjustmentRoutes = require('./routes/stockAdjustments.routes');
const stockCountRoutes = require('./routes/stockCounts.routes');
const salesRoutes = require('./routes/sales.routes');
const customerReturnRoutes = require('./routes/customerReturns.routes');
const supplierReturnRoutes = require('./routes/supplierReturns.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/reports.routes');
const auditRoutes = require('./routes/audit.routes');
const notificationRoutes = require('./routes/notifications.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Basic brute-force protection on auth endpoints (req #36 account lockout support).
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use('/api/auth/login', authLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/goods-receipts', goodsReceiptRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/stock-transfers', stockTransferRoutes);
app.use('/api/stock-adjustments', stockAdjustmentRoutes);
app.use('/api/stock-counts', stockCountRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customer-returns', customerReturnRoutes);
app.use('/api/supplier-returns', supplierReturnRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
