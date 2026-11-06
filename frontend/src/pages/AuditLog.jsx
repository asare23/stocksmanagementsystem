import { useApi } from '../api/useApi';
import DataTable from '../components/DataTable';

export default function AuditLog() {
  const { data, loading } = useApi('/audit-logs');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Audit Log</h1>
      <div className="card">
        {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading...</div> : (
          <DataTable
            rows={data?.data || []}
            columns={[
              { key: 'createdAt', header: 'Time', render: (r) => new Date(r.createdAt).toLocaleString() },
              { key: 'user', header: 'User', render: (r) => r.user?.fullName || 'System' },
              { key: 'action', header: 'Action' },
              { key: 'entityType', header: 'Entity' },
              { key: 'entityId', header: 'Entity ID' },
            ]}
          />
        )}
      </div>
    </div>
  );
}
