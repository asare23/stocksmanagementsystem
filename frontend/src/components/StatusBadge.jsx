const COLORS = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  PARTIALLY_RECEIVED: 'bg-amber-100 text-amber-800',
  FULLY_RECEIVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  REQUESTED: 'bg-amber-100 text-amber-800',
  DISPATCHED: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  POSTED: 'bg-green-100 text-green-800',
  REVERSED: 'bg-red-100 text-red-800',
  COMPLETED_SALE: 'bg-green-100 text-green-800',
  UNPAID: 'bg-red-100 text-red-800',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-800',
  PAID: 'bg-green-100 text-green-800',
  OVERPAID: 'bg-blue-100 text-blue-800',
  LOW: 'bg-amber-100 text-amber-800',
  OUT: 'bg-red-100 text-red-800',
};

export default function StatusBadge({ status }) {
  const cls = COLORS[status] || 'bg-gray-100 text-gray-700';
  return <span className={`badge ${cls}`}>{status?.replace(/_/g, ' ')}</span>;
}
