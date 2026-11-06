import { useState, useEffect } from 'react';
import api from '../api/client';
import { useApi } from '../api/useApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ErrorMessage from '../components/ErrorMessage';
import StatusBadge from '../components/StatusBadge';
import PermissionGate from '../components/PermissionGate';

export default function GoodsReceipts() {
  const { data, loading, refetch } = useApi('/goods-receipts');
  const { data: suppliers } = useApi('/suppliers');
  const { data: warehouses } = useApi('/warehouses');
  const { data: openPOs } = useApi('/purchase-orders', { params: { status: 'APPROVED' } });
  const { data: partialPOs } = useApi('/purchase-orders', { params: { status: 'PARTIALLY_RECEIVED' } });

  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ purchaseOrderId: '', supplierId: '', warehouseId: '' });
  const [items, setItems] = useState([]);

  const candidatePOs = [...(openPOs?.data || []), ...(partialPOs?.data || [])];

  useEffect(() => {
    const po = candidatePOs.find((p) => p.id === form.purchaseOrderId);
    if (po) {
      setForm((f) => ({ ...f, supplierId: po.supplierId, warehouseId: po.warehouseId }));
      setItems(
        po.items
          .filter((i) => i.quantityReceived < i.quantityOrdered)
          .map((i) => ({
            purchaseOrderItemId: i.id,
            productId: i.productId,
            productName: i.product?.name,
            quantityReceived: i.quantityOrdered - i.quantityReceived,
            unitCost: Number(i.unitCost),
          }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.purchaseOrderId]);

  const openCreate = () => {
    setForm({ purchaseOrderId: '', supplierId: '', warehouseId: '' });
    setItems([]);
    setError(null);
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/goods-receipts', { ...form, purchaseOrderId: form.purchaseOrderId || undefined, items });
      setOpen(false);
      refetch();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const confirm = async (grn) => {
    setError(null);
    try {
      await api.post(`/goods-receipts/${grn.id}/confirm`);
      refetch();
    } catch (err) {
      setError(err);
    }
  };

  const rows = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Goods Receipts</h1>
        <PermissionGate permission="STOCK_RECEIVE">
          <button className="btn-primary" onClick={openCreate}>+ New Goods Receipt</button>
        </PermissionGate>
      </div>

      <ErrorMessage error={error} />

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
        ) : (
          <DataTable
            rows={rows}
            columns={[
              { key: 'grnNumber', header: 'GRN #' },
              { key: 'supplier', header: 'Supplier', render: (r) => r.supplier?.name },
              { key: 'warehouse', header: 'Warehouse', render: (r) => r.warehouse?.name },
              { key: 'purchaseOrder', header: 'PO #', render: (r) => r.purchaseOrder?.poNumber || '(standalone)' },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'actions', header: '', render: (r) => r.status === 'DRAFT' ? (
                  <PermissionGate permission="STOCK_RECEIVE">
                    <button className="btn-primary text-xs" onClick={(e) => { e.stopPropagation(); confirm(r); }}>Confirm (post stock)</button>
                  </PermissionGate>
                ) : null,
              },
            ]}
          />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Goods Receipt" wide>
        <ErrorMessage error={error} />
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Against Purchase Order (optional)</label>
            <select className="input" value={form.purchaseOrderId} onChange={(e) => setForm({ ...form, purchaseOrderId: e.target.value })}>
              <option value="">-- standalone receipt --</option>
              {candidatePOs.map((po) => <option key={po.id} value={po.id}>{po.poNumber} — {po.supplier?.name}</option>)}
            </select>
          </div>

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

          {items.length > 0 ? (
            <div>
              <label className="label">Items being received</label>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end text-sm">
                    <div className="col-span-5">{it.productName}</div>
                    <div className="col-span-3">
                      <label className="label">Qty received</label>
                      <input className="input" type="number" value={it.quantityReceived} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, quantityReceived: Number(e.target.value) } : x))} />
                    </div>
                    <div className="col-span-4">
                      <label className="label">Unit cost</label>
                      <input className="input" type="number" step="any" value={it.unitCost} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, unitCost: Number(e.target.value) } : x))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Select a purchase order above to pre-fill items, or use standalone mode and enter items manually via the API.</p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || !items.length}>{saving ? 'Saving...' : 'Create Receipt (Draft)'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
