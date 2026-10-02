import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import DataTable, { Badge } from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

const emptyForm = { email: '', password: '', full_name: '', role_code: '', phone: '' };

/**
 * Staff & Roles — this is the "Registration" screen: only an Admin can
 * create new Manager / Sales / Admin logins here (staff don't self-register).
 */
export default function Users() {
  const { staff: me } = useAuth();
  const notify = useToast();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([api.listUsers(), api.listRoles()]);
      setUsers(u);
      setRoles(r);
      setForm((f) => ({ ...f, role_code: f.role_code || r[0]?.code || '' }));
    } catch (e) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createStaff({
        email: form.email.trim(), password: form.password, full_name: form.full_name.trim(),
        role_code: form.role_code, phone: form.phone.trim() || undefined,
      });
      notify(`Staff account created for ${form.email}`);
      setShowForm(false);
      setForm({ ...emptyForm, role_code: roles[0]?.code || '' });
      load();
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function toggleStatus(publicId, status) {
    try {
      await api.setStaffStatus(publicId, status);
      notify(`Account ${status}`);
      load();
    } catch (e) { notify(e.message, 'error'); }
  }

  async function changeRole(publicId, role_code) {
    try {
      await api.setStaffRole(publicId, role_code);
      notify('Role updated');
      load();
    } catch (e) { notify(e.message, 'error'); }
  }

  const columns = [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'roles', label: 'Role',
      render: (r) => (
        <select value={r.roles[0] || ''} onChange={(e) => changeRole(r.public_id, e.target.value)}
                disabled={r.email === me?.email}>
          {roles.map((role) => <option key={role.code} value={role.code}>{role.name}</option>)}
        </select>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> },
    { key: 'last_login_at', label: 'Last login', render: (r) => (r.last_login_at ? new Date(r.last_login_at).toLocaleString() : 'Never') },
    {
      key: 'actions', label: '',
      render: (r) => (
        r.email === me?.email
          ? <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>You</span>
          : (
            <button className={`btn btn-sm ${r.status === 'active' ? 'btn-danger' : 'btn-gold'}`}
                    onClick={() => toggleStatus(r.public_id, r.status === 'active' ? 'disabled' : 'active')}>
              {r.status === 'active' ? 'Disable' : 'Activate'}
            </button>
          )
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Staff & Roles" />
      <div className="content">
        <div className="card">
          <div className="card-head">
            <h2>Staff accounts</h2>
            <div className="actions">
              <button className="btn btn-gold btn-sm" onClick={() => setShowForm(true)}>+ Add staff (Register)</button>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            Staff can't sign themselves up — create their login here, give them the email and
            password, and they can log in right away at the Login page.
          </p>
          <DataTable columns={columns} rows={users} keyField="public_id"
                    emptyText={loading ? 'Loading…' : 'No staff accounts yet.'} />
        </div>
      </div>

      {showForm && (
        <Modal title="Register a new staff member" onClose={() => setShowForm(false)}>
          <form onSubmit={submit}>
            <div className="field">
              <label>Full name</label>
              <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Temporary password</label>
              <input required type="text" minLength={6} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Share this with them securely" />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Role</label>
                <select value={form.role_code} onChange={(e) => setForm({ ...form, role_code: e.target.value })}>
                  {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Phone (optional)</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create account'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
