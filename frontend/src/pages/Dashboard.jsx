import { useMemo } from "react";
import { useApi } from "../api/useApi";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#d9ef8b", "#111827", "#f1c75b", "#8bc34a", "#67aeb7"];
const money = (value) =>
  `GHS ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const number = (value) => Number(value || 0).toLocaleString();

function Kpi({ label, value, note, tone = "text-gray-900", icon }) {
  return (
    <div className="card min-w-0 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-gray-500">
            {label}
          </div>
          <div className={`mt-2 truncate text-xl font-bold ${tone}`}>
            {value}
          </div>
          {note && (
            <div className="mt-1 truncate text-[11px] text-gray-400">
              {note}
            </div>
          )}
        </div>
        <span className="rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-400">
          {icon}
        </span>
      </div>
    </div>
  );
}

function DashboardLoader() {
  const skeletons = Array.from({ length: 8 });

  return (
    <div className="space-y-4" aria-label="Loading dashboard" role="status">
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white">
          <span className="absolute inset-1 animate-spin rounded-full border-2 border-white/20 border-t-yellow-300" />
          <span className="relative text-sm font-bold">SMS</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-800">
            Loading dashboard
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Refreshing stock and sales activity...
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {skeletons.slice(0, 4).map((_, index) => (
          <div key={index} className="card h-24 animate-pulse p-4">
            <div className="h-2 w-2/3 rounded bg-gray-200" />
            <div className="mt-4 h-5 w-1/2 rounded bg-gray-200" />
            <div className="mt-2 h-2 w-3/4 rounded bg-gray-100" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.55fr_0.8fr]">
        {[0, 1, 2].map((index) => (
          <div key={index} className="card animate-pulse p-4">
            <div className="h-3 w-1/3 rounded bg-gray-200" />
            <div className="mt-4 flex h-44 items-end gap-2 rounded bg-gray-50 px-4 pb-4">
              {[38, 62, 46, 78, 54, 68].map((height, barIndex) => (
                <div
                  key={barIndex}
                  className="flex-1 rounded-t bg-gray-200"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card h-40 animate-pulse p-4">
        <div className="h-3 w-1/4 rounded bg-gray-200" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-3 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {action && <span className="text-xs text-gray-400">{action}</span>}
      </div>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const { data: summary, loading } = useApi("/dashboard/summary");
  const { data: trend } = useApi("/dashboard/sales-trend", {
    params: { days: 14 },
  });
  const { data: top } = useApi("/dashboard/top-products", {
    params: { limit: 8 },
  });
  const { data: inventory } = useApi("/inventory");
  const inventoryRows = inventory?.data || [];
  const salesData = trend?.data || [];
  const topRows = top?.data || [];

  const categoryData = useMemo(() => {
    const totals = {};
    inventoryRows.forEach((row) => {
      const category = row.product?.category?.name || "Uncategorized";
      totals[category] =
        (totals[category] || 0) + Number(row.quantityOnHand || 0);
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [inventoryRows]);

  const restockRows = inventoryRows
    .filter(
      (row) =>
        Number(row.quantityOnHand || 0) <=
        Number(row.product?.reorderLevel || 0),
    )
    .sort((a, b) => Number(a.quantityOnHand) - Number(b.quantityOnHand))
    .slice(0, 5);

  if (loading) return <DashboardLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Today, stock and warehouse activity
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            className="input pl-8"
            placeholder="Search item, order, SKU..."
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            ⌕
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Total Products"
          value={number(summary?.totalProducts)}
          note="Active products"
          icon="▦"
        />
        <Kpi
          label="Available Stock Units"
          value={number(summary?.totalStockUnits)}
          note="Across warehouses"
          icon="↗"
        />
        <Kpi
          label="Today's Sales Revenue"
          value={money(summary?.todaysSales)}
          note={`${number(summary?.todaysSalesCount)} sales today`}
          icon="GH"
        />
        <Kpi
          label="Total Inventory Value"
          value={money(summary?.inventoryValue)}
          note="Valuation at cost"
          icon="◇"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Low Stock Items"
          value={number(summary?.lowStockItems)}
          note="Needs attention"
          tone="text-amber-600"
        />
        <Kpi
          label="Out of Stock"
          value={number(summary?.outOfStockItems)}
          tone="text-red-600"
        />
        <Kpi
          label="Today's Purchases"
          value={number(summary?.todaysPurchases)}
          note="Confirmed receipts"
        />
        <Kpi
          label="Pending POs"
          value={number(summary?.pendingPurchaseOrders)}
          note="Awaiting processing"
          tone="text-blue-600"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.8fr)_minmax(380px,1.55fr)_minmax(220px,0.8fr)]">
        <Panel title="Stock by Category" action="Total Value">
          <div className="px-4 pb-3">
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {categoryData.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-gray-600">
                    {item.name}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {number(item.value)} units
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Sales Trend — Last 14 Days" action="This Week">
          <div className="px-2 pt-3 sm:px-4">
            <div className="mb-1 px-2 text-2xl font-bold text-gray-900">
              {money(
                salesData.reduce(
                  (sum, item) => sum + Number(item.total || 0),
                  0,
                ),
              )}
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={salesData}
                  margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#b8d925"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="#b8d925"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#eef0f4" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(value) => money(value)} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#b5cf2f"
                    strokeWidth={2.5}
                    fill="url(#salesArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>

        <Panel title="Top Products" action="By quantity">
          <div className="divide-y divide-gray-100">
            {topRows.slice(0, 5).map((item, index) => (
              <div
                key={item.product?.id || index}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-gray-800">
                    {item.product?.name || "Unknown"}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-400">
                    {number(item.quantitySold)} units sold
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(250px,0.75fr)]">
        <Panel title="Current Product Inventory" action="Stock overview">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryRows.slice(0, 5).map((row) => {
                  const quantity = Number(row.quantityOnHand || 0);
                  const low =
                    quantity <= Number(row.product?.reorderLevel || 0);
                  return (
                    <tr key={row.id}>
                      <td className="font-medium">{row.product?.name}</td>
                      <td>{row.product?.sku}</td>
                      <td>{row.product?.category?.name || "-"}</td>
                      <td>{number(quantity)} pcs</td>
                      <td>
                        {money(quantity * Number(row.product?.costPrice || 0))}
                      </td>
                      <td>
                        <span
                          className={`badge ${low ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
                        >
                          {low ? "Low stock" : "In stock"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Upcoming Restock" action="Reorder alerts">
          <div className="divide-y divide-gray-100">
            {restockRows.length ? (
              restockRows.map((row) => (
                <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                    ↻
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-gray-800">
                      {row.product?.name}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400">
                      Reorder at {number(row.product?.reorderLevel)} units
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-700">
                    {number(row.quantityOnHand)} pcs
                  </span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-xs text-gray-400">
                No reorder alerts
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
