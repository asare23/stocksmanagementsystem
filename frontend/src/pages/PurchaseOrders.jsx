import { useState } from 'react';
import api from '../api/client';
import { useApi } from '../api/useApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ErrorMessage from '../components/ErrorMessage';
import StatusBadge from '../components/StatusBadge';
import PermissionGate from '../components/PermissionGate';

function LineItemsEditor({ products, items, setItems }) {
  const addRow = () => setItems([...items, { productId: '', quantity: 1, unitCost: 0 }]);
  const updateRow = (i, patch) => setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeRow = (i) => setItems(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-6">
            <label className="label">Product</label>
            <select className="input" value={item.productId} onChange={(e) => updateRow(i, { productId: e.target.value })} required>
              <option value="">-- select product --</option>
              {(products?.data || []).map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Qty</label>
            <input className="input" type="number" min="1" value={item.quantity} onChange={(e) => updateRow(i, { quantity: Number(e.target.value) })} required />
          </div>
          <div className="col-span-3">
            <label className="label">Unit Cost</label>
            <input className="input" type="number" step="any" value={item.unitCost} onChange={(e) => updateRow(i, { unitCost: Number(e.target.value) })} required />
          </div>
          <div className="col-span-1">
            <button type="button" className="btn-secondary" onClick={() => removeRow(i)}>&times;</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn-secondary text-xs" onClick={addRow}>+ Add line</button>
    </div>
  );
}

export default function PurchaseOrders() {
  const { data, loading, refetch } = useApi('/purchase-orders');
  const { data: suppliers } = useApi('/suppliers');
  const { data: warehouses } = useApi('/warehouses');
  const { data: products } = useApi('/products', { params: { pageSize: 500 } });

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplierId: '', warehouseId: '', notes: '' });
  const [items, setItems] = useState([{ productId: '', quantity: 1, unitCost: 0 }]);

  const openCreate = () => {
    setForm({ supplierId: '', warehouseId: '', notes: '' });
    setItems([{ productId: '', quantity: 1, unitCost: 0 }]);
    setError(null);
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/purchase-orders', { ...form, items: items.filter((i) => i.productId) });
      setOpen(false);
      refetch();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const doAction = async (po, action) => {
    setError(null);
    try {
      const { data: updated } = await api.post(`/purchase-orders/${po.id}/${action}`);
      setDetail(updated);
      refetch();
    } catch (err) {
      setError(err);
    }
  };

  const rows = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Purchase Orders</h1>
        <PermissionGate permission="PURCHASE_CREATE">
          <button className="btn-primary" onClick={openCreate}>+ New Purchase Order</button>
        </PermissionGate>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
        ) : (
          <DataTable
            rows={rows}
            onRowClick={(r) => { setDetail(r); setError(null); }}
            columns={[
              { key: 'poNumber', header: 'PO #' },
              { key: 'supplier', header: 'Supplier', render: (r) => r.supplier?.name },
              { key: 'warehouse', header: 'Warehouse', render: (r) => r.warehouse?.name },
              { key: 'totalAmount', header: 'Total', render: (r) => Number(r.totalAmount).toFixed(2) },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'orderDate', header: 'Date', render: (r) => new Date(r.orderDate).toLocaleDateString() },
            ]}
          />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Purchase Order" wide>
        <ErrorMessage error={error} />
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Supplier *</label>
              <select className="input" required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">-- select --</option>
                {(suppliers?.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Warehouse *</label>
              <select className="input" required value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                <option value="">-- select --</option>
                {(warehouses?.data || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <LineItemsEditor products={products} items={items} setItems={setItems} />
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create PO (Draft)'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Purchase Order ${detail?.poNumber || ''}`} wide>
        {detail && (
          <div className="space-y-4">
            <ErrorMessage error={error} />
            <div className="flex items-center gap-3 text-sm">
              <StatusBadge status={detail.status} />
              <span className="text-gray-500">{detail.supplier?.name} — {detail.warehouse?.name}</span>
            </div>
            <DataTable
              rows={detail.items || []}
              columns={[
                { key: 'product', header: 'Product', render: (r) => r.product?.name },
                { key: 'quantityOrdered', header: 'Ordered' },
                { key: 'quantityReceived', header: 'Received' },
                { key: 'unitCost', header: 'Unit Cost', render: (r) => Number(r.unitCost).toFixed(2) },
                { key: 'lineTotal', header: 'Line Total', render: (r) => Number(r.lineTotal).toFixed(2) },
              ]}
            />
            <div className="flex justify-end gap-2 border-t pt-3">
              {detail.status === 'DRAFT' && (
                <button className="btn-secondary" onClick={() => doAction(detail, 'submit')}>Submit for Approval</button>
              )}
              <PermissionGate permission="PURCHASE_APPROVE">
                {detail.status === 'PENDING_APPROVAL' && (
                  <button className="btn-primary" onClick={() => doAction(detail, 'approve')}>Approve</button>
                )}
                {['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(detail.status) && (
                  <button className="btn-danger" onClick={() => doAction(detail, 'cancel')}>Cancel</button>
                )}
                {detail.status === 'FULLY_RECEIVED' && (
                  <button className="btn-secondary" onClick={() => doAction(detail, 'close')}>Close</button>
                )}
              </PermissionGate>
            </div>
            <p className="text-xs text-gray-400">To receive stock against this PO, go to Goods Receipts → New Goods Receipt and select this PO.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
