import { useState } from 'react';
import api from '../api/client';
import { useApi } from '../api/useApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import ErrorMessage from '../components/ErrorMessage';
import PermissionGate from '../components/PermissionGate';

export default function SalesHistory() {
  const { data, loading, refetch } = useApi('/sales');
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  const reverse = async (sale) => {
    if (!confirm(`Reverse sale ${sale.invoiceNumber}? This restores stock and marks it REVERSED.`)) return;
    setError(null);
    try {
      await api.post(`/sales/${sale.id}/reverse`);
      setDetail(null);
      refetch();
    } catch (err) {
      setError(err);
    }
  };

  const rows = data?.data || [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Sales History</h1>
      <ErrorMessage error={error} />
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
        ) : (
          <DataTable
            rows={rows}
            onRowClick={(r) => setDetail(r)}
            columns={[
              { key: 'invoiceNumber', header: 'Invoice #' },
              { key: 'customer', header: 'Customer', render: (r) => r.customer?.name || 'Walk-in' },
              { key: 'salesperson', header: 'Sold By', render: (r) => r.salesPerson?.fullName },
              { key: 'total', header: 'Total', render: (r) => Number(r.total).toFixed(2) },
              { key: 'paymentStatus', header: 'Payment', render: (r) => <StatusBadge status={r.paymentStatus} /> },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'createdAt', header: 'Date', render: (r) => new Date(r.createdAt).toLocaleString() },
            ]}
          />
        )}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Invoice ${detail?.invoiceNumber || ''}`} wide>
        {detail && (
          <div className="space-y-4">
            <div className="flex gap-3 text-sm">
              <StatusBadge status={detail.status} />
              <StatusBadge status={detail.paymentStatus} />
            </div>
            <DataTable
              rows={detail.items || []}
              columns={[
                { key: 'product', header: 'Product', render: (r) => r.product?.name },
                { key: 'quantity', header: 'Qty' },
                { key: 'unitPrice', header: 'Unit Price', render: (r) => Number(r.unitPrice).toFixed(2) },
                { key: 'discount', header: 'Discount', render: (r) => Number(r.discount).toFixed(2) },
                { key: 'lineTotal', header: 'Line Total', render: (r) => Number(r.lineTotal).toFixed(2) },
              ]}
            />
            <div className="text-sm text-right space-y-1">
              <div>Total: GHS {Number(detail.total).toFixed(2)}</div>
              <div>Paid: GHS {Number(detail.amountPaid).toFixed(2)}</div>
              <div>Balance: GHS {Number(detail.balance).toFixed(2)}</div>
            </div>
            {detail.status !== 'REVERSED' && (
              <div className="flex justify-end border-t pt-3">
                <PermissionGate permission="SALES_CANCEL">
                  <button className="btn-danger" onClick={() => reverse(detail)}>Reverse Sale</button>
                </PermissionGate>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
