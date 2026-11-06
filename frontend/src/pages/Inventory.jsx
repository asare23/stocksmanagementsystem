import { useState } from "react";
import { useApi } from "../api/useApi";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

export default function Inventory() {
  const { data: warehouses } = useApi("/warehouses");
  const [warehouseId, setWarehouseId] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { data, loading } = useApi("/inventory", {
    params: {
      warehouseId: warehouseId || undefined,
      lowStockOnly: lowStockOnly || undefined,
    },
  });

  const [ledgerProduct, setLedgerProduct] = useState(null);
  const { data: movements } = useApi(
    ledgerProduct ? `/inventory/${ledgerProduct.id}/movements` : null,
    { skip: !ledgerProduct },
  );

  const rows = data?.data || [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Inventory</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          className="input sm:max-w-xs"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
        >
          <option value="">All warehouses</option>
          {(warehouses?.data || []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low stock only
        </label>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : (
          <DataTable
            rows={rows}
            keyField="id"
            onRowClick={(r) => setLedgerProduct(r.product)}
            columns={[
              { key: "sku", header: "SKU", render: (r) => r.product?.sku },
              {
                key: "name",
                header: "Product",
                render: (r) => r.product?.name,
              },
              {
                key: "warehouse",
                header: "Warehouse",
                render: (r) => r.warehouse?.name,
              },
              { key: "quantityOnHand", header: "On Hand" },
              { key: "quantityReserved", header: "Reserved" },
              { key: "availableStock", header: "Available" },
              {
                key: "reorderLevel",
                header: "Reorder Lvl",
                render: (r) => r.product?.reorderLevel,
              },
            ]}
          />
        )}
      </div>

      <Modal
        open={!!ledgerProduct}
        onClose={() => setLedgerProduct(null)}
        title={`Movement Ledger — ${ledgerProduct?.name || ""}`}
        wide
      >
        <DataTable
          rows={movements?.data || []}
          columns={[
            {
              key: "createdAt",
              header: "Date",
              render: (r) => new Date(r.createdAt).toLocaleString(),
            },
            { key: "txnType", header: "Type" },
            {
              key: "warehouse",
              header: "Warehouse",
              render: (r) => r.warehouse?.name,
            },
            { key: "quantityIn", header: "In" },
            { key: "quantityOut", header: "Out" },
            { key: "balanceAfter", header: "Balance" },
            { key: "reference", header: "Reference" },
            { key: "user", header: "By", render: (r) => r.user?.fullName },
          ]}
        />
      </Modal>
    </div>
  );
}
