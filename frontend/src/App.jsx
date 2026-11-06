import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import CategoriesBrands from './pages/CategoriesBrands';
import Inventory from './pages/Inventory';
import StockTransfers from './pages/StockTransfers';
import StockAdjustments from './pages/StockAdjustments';
import StockCounts from './pages/StockCounts';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import PurchaseOrders from './pages/PurchaseOrders';
import GoodsReceipts from './pages/GoodsReceipts';
import Pos from './pages/Pos';
import SalesHistory from './pages/SalesHistory';
import Returns from './pages/Returns';
import Reports from './pages/Reports';
import Warehouses from './pages/Warehouses';
import UsersAndRoles from './pages/UsersAndRoles';
import AuditLog from './pages/AuditLog';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<CategoriesBrands />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="stock-transfers" element={<StockTransfers />} />
        <Route path="stock-adjustments" element={<StockAdjustments />} />
        <Route path="stock-counts" element={<StockCounts />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="customers" element={<Customers />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="goods-receipts" element={<GoodsReceipts />} />
        <Route path="pos" element={<Pos />} />
        <Route path="sales" element={<SalesHistory />} />
        <Route path="returns" element={<Returns />} />
        <Route path="reports" element={<Reports />} />
        <Route path="warehouses" element={<Warehouses />} />
        <Route path="users" element={<UsersAndRoles />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
