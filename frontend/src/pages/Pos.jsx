import { useState } from 'react';
import api from '../api/client';
import { useApi } from '../api/useApi';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';

export default function Pos() {
  const { user } = useAuth();
  const { data: products } = useApi('/products', { params: { pageSize: 500 } });
  const { data: customers } = useApi('/customers');
  const { data: warehouses } = useApi('/warehouses');
  const { data: branches } = useApi('/branches');

  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [search, setSearch] = useState('');

  const addToCart = (product) => {
    setCart((c) => {
      const existing = c.find((i) => i.productId === product.id);
      if (existing) {
        return c.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...c, { productId: product.id, name: product.name, sku: product.sku, quantity: 1, unitPrice: Number(product.sellingPrice), discount: 0, tax: 0 }];
    });
  };

  const updateLine = (productId, patch) => {
    setCart((c) => c.map((i) => (i.productId === productId ? { ...i, ...patch } : i)));
  };
  const removeLine = (productId) => setCart((c) => c.filter((i) => i.productId !== productId));

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountTotal = cart.reduce((s, i) => s + Number(i.discount || 0), 0);
  const taxTotal = cart.reduce((s, i) => s + Number(i.tax || 0), 0);
  const total = subtotal - discountTotal + taxTotal;

  const filteredProducts = (products?.data || []).filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const checkout = async () => {
    if (!warehouseId || !branchId || !cart.length) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post('/sales', {
        customerId: customerId || undefined,
        branchId,
        warehouseId,
        items: cart.map(({ name, sku, ...rest }) => rest),
        payments: [{ method: paymentMethod, amount: total }],
      });
      setLastSale(data);
      setCart([]);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">POS / New Sale</h1>
      <ErrorMessage error={error} />

      {lastSale && (
        <div className="card p-4 bg-green-50 border-green-200">
          <div className="font-semibold text-green-800">Sale completed: {lastSale.invoiceNumber}</div>
          <div className="text-sm text-green-700">Total GHS {Number(lastSale.total).toFixed(2)} — status {lastSale.paymentStatus}</div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card p-4 space-y-3">
          <input className="input" placeholder="Search product by name or SKU / scan barcode..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-56 overflow-y-auto divide-y">
            {filteredProducts.slice(0, 30).map((p) => (
              <button key={p.id} type="button" onClick={() => addToCart(p)} className="w-full text-left py-2 text-sm flex justify-between hover:bg-gray-50 px-1">
                <span>{p.name} <span className="text-gray-400">({p.sku})</span></span>
                <span className="font-medium">GHS {Number(p.sellingPrice).toFixed(2)}</span>
              </button>
            ))}
          </div>

          <div className="border-t pt-3">
            <h2 className="text-sm font-semibold mb-2">Cart</h2>
            {!cart.length && <p className="text-sm text-gray-400">No items yet — click a product above to add it.</p>}
            <div className="space-y-2">
              {cart.map((i) => (
                <div key={i.productId} className="grid grid-cols-12 gap-2 items-center text-sm">
                  <div className="col-span-4">{i.name}</div>
                  <div className="col-span-2">
                    <input className="input" type="number" min="1" value={i.quantity} onChange={(e) => updateLine(i.productId, { quantity: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <input className="input" type="number" step="any" value={i.unitPrice} onChange={(e) => updateLine(i.productId, { unitPrice: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <input className="input" type="number" step="any" placeholder="discount" value={i.discount} onChange={(e) => updateLine(i.productId, { discount: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-1 text-right">{(i.quantity * i.unitPrice - i.discount).toFixed(2)}</div>
                  <div className="col-span-1 text-right">
                    <button className="text-red-500" onClick={() => removeLine(i.productId)}>&times;</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-4 space-y-3 h-fit">
          <div>
            <label className="label">Branch *</label>
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">-- select --</option>
              {(branches?.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Warehouse *</label>
            <select className="input" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">-- select --</option>
              {(warehouses?.data || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Customer</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in</option>
              {(customers?.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {['CASH', 'CARD', 'MOBILE_MONEY', 'CREDIT', 'BANK_TRANSFER'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div className="border-t pt-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-{discountTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{taxTotal.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base"><span>Total</span><span>GHS {total.toFixed(2)}</span></div>
          </div>

          <button className="btn-primary w-full" disabled={saving || !cart.length || !warehouseId || !branchId} onClick={checkout}>
            {saving ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}
