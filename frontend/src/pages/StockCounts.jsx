import { useState } from 'react';
import api from '../api/client';
import { useApi } from '../api/useApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import ErrorMessage from '../components/ErrorMessage';
import PermissionGate from '../components/PermissionGate';

export default function StockCounts() {
  const { data, loading, refetch } = useApi('/stock-counts');
  const { data: warehouses } = useApi('/warehouses');

  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(null);
  const [physicals, setPhysicals] = useState({});

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/stock-counts', { warehouseId });
      setOpen(false);
      refetch();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (count) => {
    setDetail(count);
    setPhysicals(Object.fromEntries((count.items || []).map((i) => [i.productId, i.physicalQuantity ?? i.systemQuantity])));
    setError(null);
  };

  const submitCounts = async () => {
    setError(null);
    try {
      const { data: updated } = await api.post(`/stock-counts/${detail.id}/enter-counts`, {
        items: Object.entries(physicals).map(([productId, physicalQuantity]) => ({ productId, physicalQuantity: Number(physicalQuantity) })),
      });
      setDetail(updated);
      refetch();
    } catch (err) {
      setError(err);
    }
  };

  const approve = async () => {
    setError(null);
    try {
      const { data: result } = await api.post(`/stock-counts/${detail.id}/approve`);
      setDetail(result.count);
      refetch();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stock Counts</h1>
        <PermissionGate permission="STOCK_ADJUST">
          <button className="btn-primary" onClick={() => { setOpen(true); setWarehouseId(''); setError(null); }}>+ New Stock Count</button>
        </PermissionGate>
      </div>
      <ErrorMessage error={error} />
      <div className="card">
        {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading...</div> : (
          <DataTable
            rows={data?.data || []}
            onRowClick={openDetail}
            columns={[
              { key: 'countNumber', header: 'Count #' },
              { key: 'warehouse', header: 'Warehouse', render: (r) => r.warehouse?.name },
              { key: 'items', header: 'Items', render: (r) => r.items?.length },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Stock Count">
        <ErrorMessage error={error} />
        <form onSubmit={create} className="space-y-3">
          <div>
            <label className="label">Warehouse *</label>
            <select className="input" required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">-- select --</option>
              {(warehouses?.data || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-400">This snapshots the current system quantity for every product in this warehouse.</p>
          <div className="flex justify-end gap-2 border-t pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Count'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Stock Count ${detail?.countNumber || ''}`} wide>
        {detail && (
          <div className="space-y-4">
            <StatusBadge status={detail.status} />
            <table className="table">
              <thead><tr><th>Product</th><th>System Qty</th><th>Physical Qty</th><th>Difference</th></tr></thead>
              <tbody>
                {(detail.items || []).map((i) => (
                  <tr key={i.id}>
                    <td>{i.product?.name}</td>
                    <td>{i.systemQuantity}</td>
                    <td>
                      <input
                        className="input !py-1 w-24"
                        type="number"
                        disabled={detail.status === 'COMPLETED'}
                        value={physicals[i.productId] ?? ''}
                        onChange={(e) => setPhysicals({ ...physicals, [i.productId]: e.target.value })}
                      />
                    </td>
                    <td>{i.difference ?? Number(physicals[i.productId] ?? i.systemQuantity) - i.systemQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detail.status !== 'COMPLETED' && (
              <div className="flex justify-end gap-2 border-t pt-3">
                <button className="btn-secondary" onClick={submitCounts}>Save Physical Counts</button>
                <button className="btn-primary" onClick={approve}>Approve & Generate Adjustment</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
