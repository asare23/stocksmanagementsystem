import { useState } from 'react';
import MasterDataPage from '../components/MasterDataPage';
import { useApi } from '../api/useApi';

export default function Warehouses() {
  const [tab, setTab] = useState('branches');
  const { data: branches } = useApi('/branches');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className={tab === 'branches' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('branches')}>Branches</button>
        <button className={tab === 'warehouses' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('warehouses')}>Warehouses</button>
      </div>
      {tab === 'branches' ? (
        <MasterDataPage
          title="Branches"
          endpoint="/branches"
          columns={[{ key: 'code', header: 'Code' }, { key: 'name', header: 'Name' }, { key: 'address', header: 'Address' }, { key: 'status', header: 'Status' }]}
          fields={[
            { name: 'code', label: 'Branch Code', required: true },
            { name: 'name', label: 'Branch Name', required: true },
            { name: 'address', label: 'Address', type: 'textarea' },
          ]}
        />
      ) : (
        <MasterDataPage
          title="Warehouses"
          endpoint="/warehouses"
          columns={[
            { key: 'code', header: 'Code' },
            { key: 'name', header: 'Name' },
            { key: 'branchId', header: 'Branch', render: (r) => branches?.data?.find((b) => b.id === r.branchId)?.name || r.branchId },
            { key: 'status', header: 'Status' },
          ]}
          fields={[
            { name: 'code', label: 'Warehouse Code', required: true },
            { name: 'name', label: 'Warehouse Name', required: true },
            { name: 'branchId', label: 'Branch', type: 'select', required: true, options: (branches?.data || []).map((b) => ({ value: b.id, label: b.name })) },
            { name: 'location', label: 'Location' },
          ]}
        />
      )}
    </div>
  );
}
