import { useState } from 'react';
import api from '../api/client';
import { useApi } from '../api/useApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import ErrorMessage from '../components/ErrorMessage';
import PermissionGate from '../components/PermissionGate';

const REASONS = ['DAMAGED', 'LOST', 'EXPIRED', 'THEFT', 'COUNTING_ERROR', 'DATA_CORRECTION', 'OPENING_BALANCE'];

export default function StockAdjustments() {
  const { data, loading, refetch } = useApi('/stock-adjustments');
  const { data: warehouses } = useApi('/warehouses');
  const { data: products } = useApi('/products', { params: { pageSize: 500 } });

  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ warehouseId: '', reason: 'COUNTING_ERROR', notes: '' });
  const [items, setItems] = useState([{ productId: '', quantity: 0 }]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/stock-adjustments', { ...form, items: items.filter((i) => i.productId && i.quantity !== 0) });
      setOpen(false);
      refetch();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const act = async (adj, action) => {
    setError(null);
    try {
      await api.post(`/stock-adjustments/${adj.id}/${action}`);
      refetch();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stock Adjustments</h1>
        <PermissionGate permission="STOCK_ADJUST">
          <button className="btn-primary" onClick={() => { setOpen(true); setForm({ warehouseId: '', reason: 'COUNTING_ERROR', notes: '' }); setItems([{ productId: '', quantity: 0 }]); setError(null); }}>
            + New Adjustment
          </button>
        </PermissionGate>
      </div>
      <ErrorMessage error={error} />
      <div className="card">
        {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading...</div> : (
          <DataTable
            rows={data?.data || []}
            columns={[
              { key: 'adjustmentNumber', header: 'Adj #' },
              { key: 'warehouse', header: 'Warehouse', render: (r) => r.warehouse?.name },
              { key: 'reason', header: 'Reason' },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'actions', header: '', render: (r) => r.status === 'PENDING_APPROVAL' && (
                  <PermissionGate permission="STOCK_ADJUST">
                    <div className="flex gap-2">
                      <button className="btn-primary text-xs" onClick={() => act(r, 'approve')}>Approve & Post</button>
                      <button className="btn-secondary text-xs" onClick={() => act(r, 'reject')}>Reject</button>
                    </div>
                  </PermissionGate>
                ),
              },
            ]}
          />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Stock Adjustment" wide>
        <ErrorMessage error={error} />
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Warehouse *</label>
              <select className="input" required value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                <option value="">-- select --</option>
                {(warehouses?.data || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reason *</label>
              <select className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                {REASONS.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400">Enter a positive quantity to increase stock, negative to decrease.</p>
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
                <label className="label">Quantity (+/-)</label>
                <input className="input" type="number" value={it.quantity} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, quantity: Number(e.target.value) } : x))} />
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary text-xs" onClick={() => setItems([...items, { productId: '', quantity: 0 }])}>+ Add line</button>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 border-t pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Submit for Approval'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
