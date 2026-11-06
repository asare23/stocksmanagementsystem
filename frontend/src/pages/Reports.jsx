import { useState } from 'react';
import { useApi } from '../api/useApi';
import DataTable from '../components/DataTable';

const TABS = [
  { key: 'current-stock', label: 'Current Stock', url: '/reports/inventory/current-stock' },
  { key: 'valuation', label: 'Stock Valuation', url: '/reports/inventory/valuation' },
  { key: 'dead-stock', label: 'Dead Stock', url: '/reports/inventory/dead-stock' },
  { key: 'fast-moving', label: 'Fast Moving', url: '/reports/inventory/fast-moving' },
  { key: 'slow-moving', label: 'Slow Moving', url: '/reports/inventory/slow-moving' },
  { key: 'sales-period', label: 'Sales by Period', url: '/reports/sales/by-period' },
  { key: 'sales-dimension', label: 'Sales by Product', url: '/reports/sales/by-dimension', params: { by: 'product' } },
  { key: 'profit', label: 'Profit by Product', url: '/reports/sales/profit-by-product' },
  { key: 'purchase-history', label: 'Purchase History', url: '/reports/purchases/history' },
  { key: 'outstanding-po', label: 'Outstanding POs', url: '/reports/purchases/outstanding' },
  { key: 'supplier-perf', label: 'Supplier Performance', url: '/reports/purchases/supplier-performance' },
  { key: 'financial', label: 'Financial Summary', url: '/reports/financial/summary' },
];

const COLUMN_SETS = {
  'current-stock': [
    { key: 'product', header: 'Product', render: (r) => r.product?.name },
    { key: 'warehouse', header: 'Warehouse', render: (r) => r.warehouse?.name },
    { key: 'quantityOnHand', header: 'On Hand' },
    { key: 'availableStock', header: 'Available' },
  ],
  valuation: [
    { key: 'product', header: 'Product' },
    { key: 'sku', header: 'SKU' },
    { key: 'warehouse', header: 'Warehouse' },
    { key: 'quantityOnHand', header: 'Qty' },
    { key: 'costPrice', header: 'Cost' },
    { key: 'value', header: 'Value', render: (r) => Number(r.value).toFixed(2) },
  ],
  'dead-stock': [
    { key: 'product', header: 'Product', render: (r) => r.product?.name },
    { key: 'warehouse', header: 'Warehouse', render: (r) => r.warehouse?.name },
    { key: 'quantityOnHand', header: 'Qty on Hand' },
  ],
  'fast-moving': [
    { key: 'product', header: 'Product', render: (r) => r.product?.name },
    { key: 'quantitySold', header: 'Qty Sold (30d)' },
  ],
  'slow-moving': [
    { key: 'product', header: 'Product', render: (r) => r.product?.name },
    { key: 'quantitySold', header: 'Qty Sold (30d)' },
  ],
  'sales-period': [
    { key: 'period', header: 'Period' },
    { key: 'total', header: 'Total Sales', render: (r) => Number(r.total).toFixed(2) },
  ],
  'sales-dimension': [
    { key: 'label', header: 'Product' },
    { key: 'total', header: 'Revenue', render: (r) => Number(r.total).toFixed(2) },
  ],
  profit: [
    { key: 'product', header: 'Product' },
    { key: 'sku', header: 'SKU' },
    { key: 'quantitySold', header: 'Qty Sold' },
    { key: 'revenue', header: 'Revenue', render: (r) => r.revenue.toFixed(2) },
    { key: 'cost', header: 'COGS', render: (r) => r.cost.toFixed(2) },
    { key: 'grossProfit', header: 'Gross Profit', render: (r) => r.grossProfit.toFixed(2) },
  ],
  'purchase-history': [
    { key: 'poNumber', header: 'PO #' },
    { key: 'supplier', header: 'Supplier', render: (r) => r.supplier?.name },
    { key: 'status', header: 'Status' },
    { key: 'totalAmount', header: 'Total', render: (r) => Number(r.totalAmount).toFixed(2) },
  ],
  'outstanding-po': [
    { key: 'poNumber', header: 'PO #' },
    { key: 'supplier', header: 'Supplier', render: (r) => r.supplier?.name },
    { key: 'status', header: 'Status' },
    { key: 'totalAmount', header: 'Total', render: (r) => Number(r.totalAmount).toFixed(2) },
  ],
  'supplier-perf': [
    { key: 'supplier', header: 'Supplier' },
    { key: 'totalOrders', header: 'Total Orders' },
    { key: 'totalValue', header: 'Total Value', render: (r) => r.totalValue.toFixed(2) },
    { key: 'cancelledOrders', header: 'Cancelled' },
  ],
};

export default function Reports() {
  const [tab, setTab] = useState(TABS[0]);
  const { data, loading } = useApi(tab.url, { params: tab.params });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Reports</h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} className={tab.key === t.key ? 'btn-primary text-xs' : 'btn-secondary text-xs'} onClick={() => setTab(t)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab.key === 'financial' ? (
        <div className="card p-4">
          {loading ? <div className="text-sm text-gray-500">Loading...</div> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {data && Object.entries(data).map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs uppercase text-gray-500">{k.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="text-lg font-semibold">{typeof v === 'number' ? v.toFixed(2) : v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading...</div> : (
            <DataTable rows={data?.data || []} columns={COLUMN_SETS[tab.key] || []} />
          )}
        </div>
      )}
    </div>
  );
}
