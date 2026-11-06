import { useState } from 'react';
import api from '../api/client';
import { useApi } from '../api/useApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import ErrorMessage from '../components/ErrorMessage';

function CustomerReturns() {
  const { data, loading, refetch } = useApi('/customer-returns');
  const { data: sales } = useApi('/sales');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ saleId: '', reason: '' });
  const [items, setItems] = useState([]);

  const pickSale = (saleId) => {
    const sale = sales?.data?.find((s) => s.id === saleId);
    setForm((f) => ({ ...f, saleId, customerId: sale?.customerId }));
    setItems((sale?.items || []).map((i) => ({ saleItemId: i.id, productId: i.productId, productName: i.product?.name, quantity: i.quantity, condition: 'RESALABLE' })));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/customer-returns', { ...form, items: items.filter((i) => i.quantity > 0) });
      setOpen(false);
      refetch();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const act = async (ret, action, body) => {
    setError(null);
    try {
      await api.post(`/customer-returns/${ret.id}/${action}`, body);
      refetch();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button className="btn-primary" onClick={() => { setOpen(true); setForm({ saleId: '', reason: '' }); setItems([]); setError(null); }}>+ New Customer Return</button>
      </div>
      <ErrorMessage error={error} />
      <div className="card">
        {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading...</div> : (
          <DataTable
            rows={data?.data || []}
            columns={[
              { key: 'returnNumber', header: 'Return #' },
              { key: 'sale', header: 'Invoice', render: (r) => r.sale?.invoiceNumber },
              { key: 'reason', header: 'Reason' },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'actions', header: '', render: (r) => (
                  <div className="flex gap-2">
                    {r.status === 'REQUESTED' && <button className="btn-secondary text-xs" onClick={() => act(r, 'approve')}>Approve</button>}
                    {r.status === 'APPROVED' && <button className="btn-secondary text-xs" onClick={() => act(r, 'receive')}>Receive</button>}
                    {r.status === 'RECEIVED' && <button className="btn-secondary text-xs" onClick={() => act(r, 'refund', { amount: 0 })}>Mark Refunded</button>}
                    {r.status === 'REFUNDED' && <button className="btn-secondary text-xs" onClick={() => act(r, 'complete')}>Complete</button>}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Customer Return" wide>
        <ErrorMessage error={error} />
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Original Invoice *</label>
            <select className="input" required value={form.saleId} onChange={(e) => pickSale(e.target.value)}>
              <option value="">-- select --</option>
              {(sales?.data || []).map((s) => <option key={s.id} value={s.id}>{s.invoiceNumber} — {s.customer?.name || 'Walk-in'}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reason</label>
            <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end text-sm">
              <div className="col-span-5">{it.productName}</div>
              <div className="col-span-3">
                <label className="label">Qty</label>
                <input className="input" type="number" value={it.quantity} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, quantity: Number(e.target.value) } : x))} />
              </div>
              <div className="col-span-4">
                <label className="label">Condition</label>
                <select className="input" value={it.condition} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, condition: e.target.value } : x))}>
                  <option value="RESALABLE">Resalable</option>
                  <option value="DAMAGED">Damaged</option>
                </select>
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2 border-t pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Return'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SupplierReturns() {
  const { data, loading, refetch } = useApi('/supplier-returns');
  const { data: suppliers } = useApi('/suppliers');
  const { data: products } = useApi('/products', { params: { pageSize: 500 } });
  const { data: warehouses } = useApi('/warehouses');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplierId: '', reason: '' });
  const [items, setItems] = useState([{ productId: '', quantity: 1 }]);
  const [sendWarehouseId, setSendWarehouseId] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/supplier-returns', { ...form, items: items.filter((i) => i.productId) });
      setOpen(false);
      refetch();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const act = async (ret, action, body) => {
    setError(null);
    try {
      await api.post(`/supplier-returns/${ret.id}/${action}`, body);
      refetch();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button className="btn-primary" onClick={() => { setOpen(true); setForm({ supplierId: '', reason: '' }); setItems([{ productId: '', quantity: 1 }]); setError(null); }}>+ New Supplier Return</button>
      </div>
      <ErrorMessage error={error} />
      <div className="card">
        {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading...</div> : (
          <DataTable
            rows={data?.data || []}
            columns={[
              { key: 'returnNumber', header: 'Return #' },
              { key: 'supplier', header: 'Supplier', render: (r) => r.supplier?.name },
              { key: 'reason', header: 'Reason' },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'actions', header: '', render: (r) => (
                  <div className="flex gap-2 items-center">
                    {r.status === 'REQUESTED' && <button className="btn-secondary text-xs" onClick={() => act(r, 'approve')}>Approve</button>}
                    {r.status === 'APPROVED' && (
                      <>
                        <select className="input !py-1 !text-xs" value={sendWarehouseId} onChange={(e) => setSendWarehouseId(e.target.value)}>
                          <option value="">warehouse...</option>
                          {(warehouses?.data || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                        <button className="btn-secondary text-xs" disabled={!sendWarehouseId} onClick={() => act(r, 'send', { warehouseId: sendWarehouseId })}>Send</button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Supplier Return" wide>
        <ErrorMessage error={error} />
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Supplier *</label>
            <select className="input" required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">-- select --</option>
              {(suppliers?.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reason</label>
            <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
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
          <div className="flex justify-end gap-2 border-t pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Return'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function Returns() {
  const [tab, setTab] = useState('customer');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Returns</h1>
      <div className="flex gap-2">
        <button className={tab === 'customer' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('customer')}>Customer Returns</button>
        <button className={tab === 'supplier' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('supplier')}>Supplier Returns</button>
      </div>
      {tab === 'customer' ? <CustomerReturns /> : <SupplierReturns />}
    </div>
  );
}
