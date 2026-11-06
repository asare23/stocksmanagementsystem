import { useState } from 'react';
import api from '../api/client';
import { useApi } from '../api/useApi';
import DataTable from './DataTable';
import Modal from './Modal';
import ErrorMessage from './ErrorMessage';

// fields: [{ name, label, type: 'text'|'number'|'select'|'textarea', options?: [{value,label}], required? }]
export default function MasterDataPage({ title, endpoint, columns, fields, canWrite = true }) {
  const { data, loading, refetch } = useApi(endpoint);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({});
    setError(null);
    setOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm(row);
    setError(null);
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      fields.forEach((f) => {
        if (f.type === 'number' && payload[f.name] !== undefined && payload[f.name] !== '') {
          payload[f.name] = Number(payload[f.name]);
        }
      });
      if (editing) {
        await api.put(`${endpoint}/${editing.id}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      setOpen(false);
      refetch();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const rows = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        {canWrite && (
          <button className="btn-primary" onClick={openCreate}>
            + New
          </button>
        )}
      </div>
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
        ) : (
          <DataTable columns={columns} rows={rows} onRowClick={canWrite ? openEdit : undefined} />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${title}` : `New ${title}`}>
        <ErrorMessage error={error} />
        <form onSubmit={submit} className="space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="label">{f.label}{f.required && ' *'}</label>
              {f.type === 'select' ? (
                <select
                  className="input"
                  value={form[f.name] ?? ''}
                  required={f.required}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                >
                  <option value="">-- select --</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  className="input"
                  rows={3}
                  value={form[f.name] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              ) : (
                <input
                  className="input"
                  type={f.type || 'text'}
                  step={f.type === 'number' ? 'any' : undefined}
                  value={form[f.name] ?? ''}
                  required={f.required}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
