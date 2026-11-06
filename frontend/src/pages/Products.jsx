import { useState } from "react";
import api from "../api/client";
import { useApi } from "../api/useApi";
import Modal from "../components/Modal";
import ErrorMessage from "../components/ErrorMessage";
import PermissionGate from "../components/PermissionGate";

const emptyForm = {
  sku: "",
  name: "",
  description: "",
  categoryId: "",
  brandId: "",
  unitId: "",
  costPrice: 0,
  sellingPrice: 0,
  wholesalePrice: "",
  minSellingPrice: "",
  taxRate: 0,
  minStockLevel: 0,
  maxStockLevel: "",
  reorderLevel: 0,
  reorderQuantity: 0,
  isSerialTracked: false,
  isBatchTracked: false,
  allowNegativeStock: false,
  status: "ACTIVE",
};

export default function Products() {
  const [q, setQ] = useState("");
  const { data, loading, refetch } = useApi("/products", {
    params: { q, pageSize: 100 },
  });
  const { data: categories } = useApi("/categories");
  const { data: brands } = useApi("/brands");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState([]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...emptyForm,
      ...row,
      categoryId: row.categoryId || "",
      brandId: row.brandId || "",
    });
    setError(null);
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        wholesalePrice:
          form.wholesalePrice === "" ? null : Number(form.wholesalePrice),
        minSellingPrice:
          form.minSellingPrice === "" ? null : Number(form.minSellingPrice),
        taxRate: Number(form.taxRate) || 0,
        minStockLevel: Number(form.minStockLevel) || 0,
        maxStockLevel:
          form.maxStockLevel === "" ? null : Number(form.maxStockLevel),
        reorderLevel: Number(form.reorderLevel) || 0,
        reorderQuantity: Number(form.reorderQuantity) || 0,
        categoryId: form.categoryId || null,
        brandId: form.brandId || null,
        unitId: form.unitId || null,
      };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      setOpen(false);
      refetch();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const allRows = data?.data || [];
  const rows = allRows.filter((row) => {
    const categoryMatches =
      !categoryFilter || row.categoryId === categoryFilter;
    const statusMatches = !statusFilter || row.status === statusFilter;
    return categoryMatches && statusMatches;
  });
  const activeCount = allRows.filter((row) => row.status === "ACTIVE").length;
  const inactiveCount = allRows.length - activeCount;
  const lowStockCount = allRows.filter(
    (row) => Number(row.reorderLevel || 0) > 0,
  ).length;

  const toggleAll = () => {
    setSelected(
      selected.length === rows.length ? [] : rows.map((row) => row.id),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-950">Products</h1>
          <p className="mt-1 text-xs text-gray-500">
            Manage your product catalog and stock settings.
          </p>
        </div>
        <PermissionGate permission="PRODUCT_CREATE">
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-md bg-lime-300 px-4 py-2 text-sm font-semibold text-gray-950 shadow-sm transition-colors hover:bg-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:ring-offset-2 sm:w-auto"
            onClick={openCreate}
          >
            <span className="mr-1.5 text-base leading-none">+</span>
            Add Product
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total products", allRows.length, "All catalog items"],
          ["Active", activeCount, "Available to sell"],
          ["Inactive", inactiveCount, "Hidden from use"],
          ["Tracked", lowStockCount, "Reorder configured"],
        ].map(([label, value, note], index) => (
          <div
            key={label}
            className="card flex min-h-[92px] items-center justify-between p-4"
          >
            <div>
              <div className="text-xs font-medium text-gray-500">{label}</div>
              <div className="mt-2 text-2xl font-bold text-gray-950">
                {value}
              </div>
              <div className="mt-1 text-[11px] text-gray-400">{note}</div>
            </div>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm ${index === 0 ? "bg-gray-900 text-lime-300" : "bg-gray-100 text-gray-500"}`}
            >
              {["▦", "✓", "○", "↗"][index]}
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <input
              className="input pl-9"
              placeholder="Search name, SKU or barcode"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              ⌕
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select
              className="input sm:w-44"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {(categories?.data || []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              className="input sm:w-36"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="DISCONTINUED">Discontinued</option>
            </select>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs">
            <span className="font-medium text-gray-700">
              {selected.length} selected
            </span>
            <button
              type="button"
              className="text-gray-500 hover:text-gray-900"
              onClick={() => setSelected([])}
            >
              Clear selection
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">
            Loading products...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table hidden min-w-[760px] md:table">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={
                          rows.length > 0 && selected.length === rows.length
                        }
                        onChange={toggleAll}
                      />
                    </th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Cost</th>
                    <th>Selling price</th>
                    <th>Stock rule</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const initials = row.name
                      ?.split(" ")
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join("")
                      .toUpperCase();
                    const checked = selected.includes(row.id);
                    return (
                      <tr key={row.id} className={checked ? "bg-lime-50" : ""}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelected(
                                checked
                                  ? selected.filter((id) => id !== row.id)
                                  : [...selected, row.id],
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="flex items-center gap-3 text-left"
                            onClick={() => openEdit(row)}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-xs font-bold text-lime-300">
                              {initials}
                            </span>
                            <span className="min-w-0">
                              <span className="block max-w-[220px] truncate font-semibold text-gray-900">
                                {row.name}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                {row.sku}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td>{row.category?.name || "-"}</td>
                        <td>{row.brand?.name || "-"}</td>
                        <td>GHS {Number(row.costPrice || 0).toFixed(2)}</td>
                        <td className="font-semibold">
                          GHS {Number(row.sellingPrice || 0).toFixed(2)}
                        </td>
                        <td>{row.reorderLevel || 0} units</td>
                        <td>
                          <span
                            className={`badge ${row.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="text-gray-400 hover:text-gray-900"
                            aria-label={`Edit ${row.name}`}
                          >
                            •••
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 md:hidden">
              {rows.map((row) => (
                <button
                  type="button"
                  key={row.id}
                  onClick={() => openEdit(row)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900">
                        {row.name}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {row.sku}
                      </div>
                    </div>
                    <span
                      className={`badge ${row.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <span>
                      Category:{" "}
                      <b className="text-gray-800">
                        {row.category?.name || "-"}
                      </b>
                    </span>
                    <span>
                      Price:{" "}
                      <b className="text-gray-800">
                        GHS {Number(row.sellingPrice || 0).toFixed(2)}
                      </b>
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {!rows.length && (
              <div className="p-10 text-center text-sm text-gray-400">
                No products found.
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Product" : "New Product"}
        wide
      >
        <ErrorMessage error={error} />
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">SKU / Product Code *</label>
              <input
                className="input"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Product Name *</label>
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
              >
                <option value="">-- none --</option>
                {(categories?.data || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Brand</label>
              <select
                className="input"
                value={form.brandId}
                onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              >
                <option value="">-- none --</option>
                {(brands?.data || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="DISCONTINUED">DISCONTINUED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="label">Cost Price</label>
              <input
                className="input"
                type="number"
                step="any"
                value={form.costPrice}
                onChange={(e) =>
                  setForm({ ...form, costPrice: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Selling Price</label>
              <input
                className="input"
                type="number"
                step="any"
                value={form.sellingPrice}
                onChange={(e) =>
                  setForm({ ...form, sellingPrice: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Wholesale Price</label>
              <input
                className="input"
                type="number"
                step="any"
                value={form.wholesalePrice}
                onChange={(e) =>
                  setForm({ ...form, wholesalePrice: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Tax Rate (%)</label>
              <input
                className="input"
                type="number"
                step="any"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="label">Min Stock Level</label>
              <input
                className="input"
                type="number"
                value={form.minStockLevel}
                onChange={(e) =>
                  setForm({ ...form, minStockLevel: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Reorder Level</label>
              <input
                className="input"
                type="number"
                value={form.reorderLevel}
                onChange={(e) =>
                  setForm({ ...form, reorderLevel: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Reorder Quantity</label>
              <input
                className="input"
                type="number"
                value={form.reorderQuantity}
                onChange={(e) =>
                  setForm({ ...form, reorderQuantity: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Max Stock Level</label>
              <input
                className="input"
                type="number"
                value={form.maxStockLevel}
                onChange={(e) =>
                  setForm({ ...form, maxStockLevel: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.isSerialTracked}
                onChange={(e) =>
                  setForm({ ...form, isSerialTracked: e.target.checked })
                }
              />
              Track by serial number
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.isBatchTracked}
                onChange={(e) =>
                  setForm({ ...form, isBatchTracked: e.target.checked })
                }
              />
              Track by batch
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.allowNegativeStock}
                onChange={(e) =>
                  setForm({ ...form, allowNegativeStock: e.target.checked })
                }
              />
              Allow negative stock
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
