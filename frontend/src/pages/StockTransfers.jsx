import { useState } from 'react';
import api from '../api/client';
import { useApi } from '../api/useApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import ErrorMessage from '../components/ErrorMessage';
import PermissionGate from '../components/PermissionGate';

export default function StockTransfers() {
  const { data, loading, refetch } = useApi('/stock-transfers');
  const { data: warehouses } = useApi('/warehouses');
  const { data: products } = useApi('/products', { params: { pageSize: 500 } });

  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fromWarehouseId: '', toWarehouseId: '', notes: '' });
  const [items, setItems] = useState([{ productId: '', quantity: 1 }]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/stock-transfers', { ...form, items: items.filter((i) => i.productId) });
      setOpen(false);
      refetch();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const act = async (transfer, action) => {
    setError(null);
    try {
      await api.post(`/stock-transfers/${transfer.id}/${action}`);
      refetch();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stock Transfers</h1>
        <PermissionGate permission="STOCK_TRANSFER">
          <button className="btn-primary" onClick={() => { setOpen(true); setForm({ fromWarehouseId: '', toWarehouseId: '', notes: '' }); setItems([{ productId: '', quantity: 1 }]); setError(null); }}>
            + New Transfer
          </button>
        </PermissionGate>
      </div>
      <ErrorMessage error={error} />
      <div className="card">
        {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading...</div> : (
          <DataTable
            rows={data?.data || []}
            columns={[
              { key: 'transferNumber', header: 'Transfer #' },
              { key: 'from', header: 'From', render: (r) => r.fromWarehouse?.name },
              { key: 'to', header: 'To', render: (r) => r.toWarehouse?.name },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'actions', header: '', render: (r) => (
                  <div className="flex gap-2">
                    {r.status === 'REQUESTED' && <button className="btn-secondary text-xs" onClick={() => act(r, 'approve')}>Approve</button>}
                    {r.status === 'APPROVED' && <button className="btn-secondary text-xs" onClick={() => act(r, 'dispatch')}>Dispatch</button>}
                    {r.status === 'DISPATCHED' && <button className="btn-primary text-xs" onClick={() => act(r, 'receive')}>Receive</button>}
                    {['REQUESTED', 'APPROVED'].includes(r.status) && <button className="btn-danger text-xs" onClick={() => act(r, 'cancel')}>Cancel</button>}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Stock Transfer" wide>
        <ErrorMessage error={error} />
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">From Warehouse *</label>
              <select className="input" required value={form.fromWarehouseId} onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}>
                <option value="">-- select --</option>
                {(warehouses?.data || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">To Warehouse *</label>
              <select className="input" required value={form.toWarehouseId} onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}>
                <option value="">-- select --</option>
                {(warehouses?.data || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end text-sm">
              <div className="col-span-8">
                <label className="label">Product</label>
                <select className="input" value={it.productId} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, productId: e.target.value } : x))}>
                  <option value="">-- select --</option>
                  {(products?.data || []).map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                </select>
              </div>
              <div className="col-span-4">
                <label className="label">Qty</label>
                <input className="input" type="number" min="1" value={it.quantity} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, quantity: Number(e.target.value) } : x))} />
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary text-xs" onClick={() => setItems([...items, { productId: '', quantity: 1 }])}>+ Add line</button>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 border-t pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Request Transfer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
