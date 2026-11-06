import { useState } from 'react';
import api from '../api/client';
import { useApi } from '../api/useApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import ErrorMessage from '../components/ErrorMessage';

function Users() {
  const { data, loading, refetch } = useApi('/users');
  const { data: roles } = useApi('/roles');
  const { data: branches } = useApi('/branches');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', roleId: '', branchId: '' });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/users', form);
      setOpen(false);
      refetch();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button className="btn-primary" onClick={() => { setOpen(true); setForm({ fullName: '', email: '', password: '', roleId: '', branchId: '' }); setError(null); }}>+ New User</button>
      </div>
      <div className="card">
        {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading...</div> : (
          <DataTable
            rows={data?.data || []}
            columns={[
              { key: 'fullName', header: 'Name' },
              { key: 'email', header: 'Email' },
              { key: 'role', header: 'Role', render: (r) => r.role?.name },
              { key: 'branch', header: 'Branch', render: (r) => r.branch?.name },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New User">
        <ErrorMessage error={error} />
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Password *</label>
            <input className="input" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">Role *</label>
            <select className="input" required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              <option value="">-- select --</option>
              {(roles?.data || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Branch</label>
            <select className="input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">-- none --</option>
              {(branches?.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create User'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Roles() {
  const { data, loading } = useApi('/roles');
  return (
    <div className="card">
      {loading ? <div className="p-8 text-center text-sm text-gray-500">Loading...</div> : (
        <DataTable
          rows={data?.data || []}
          columns={[
            { key: 'name', header: 'Role' },
            { key: 'description', header: 'Description' },
            { key: 'permissions', header: 'Permissions', render: (r) => (r.permissions || []).join(', ') },
          ]}
        />
      )}
    </div>
  );
}

export default function UsersAndRoles() {
  const [tab, setTab] = useState('users');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Users & Roles</h1>
      <div className="flex gap-2">
        <button className={tab === 'users' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('users')}>Users</button>
        <button className={tab === 'roles' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('roles')}>Roles & Permissions</button>
      </div>
      {tab === 'users' ? <Users /> : <Roles />}
    </div>
  );
}
