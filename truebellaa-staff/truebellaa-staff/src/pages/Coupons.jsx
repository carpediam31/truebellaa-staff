import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import DataTable, { Badge } from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

const empty = { code: '', discount_type: 'percent', discount_value: '', min_order_total: '', max_discount: '', usage_limit: '', per_customer_limit: '' };

export default function Coupons() {
  const notify = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setCoupons(await api.listCoupons()); }
    catch (e) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function toggle(code, is_active) {
    try {
      await api.setCouponStatus(code, is_active);
      notify(`${code} ${is_active ? 'activated' : 'deactivated'}`);
      load();
    } catch (e) { notify(e.message, 'error'); }
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_total: form.min_order_total ? Number(form.min_order_total) : null,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        per_customer_limit: form.per_customer_limit ? Number(form.per_customer_limit) : null,
      };
      await api.createCoupon(payload);
      notify(`Coupon ${payload.code} created`);
      setShowForm(false);
      setForm(empty);
      load();
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  }

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'discount_type', label: 'Type' },
    { key: 'discount_value', label: 'Value', render: (r) => (r.discount_type === 'percent' ? `${r.discount_value}%` : `₹${r.discount_value}`) },
    { key: 'min_order_total', label: 'Min order', render: (r) => (r.min_order_total ? `₹${r.min_order_total}` : '—') },
    { key: 'times_used', label: 'Used', render: (r) => `${r.times_used}${r.usage_limit ? ` / ${r.usage_limit}` : ''}` },
    { key: 'is_active', label: 'Status', render: (r) => <Badge value={r.is_active ? 'active' : 'disabled'} /> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <button className={`btn btn-sm ${r.is_active ? 'btn-danger' : 'btn-gold'}`}
                onClick={() => toggle(r.code, !r.is_active)}>
          {r.is_active ? 'Deactivate' : 'Activate'}
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Coupons" />
      <div className="content">
        <div className="card">
          <div className="card-head">
            <h2>Discount coupons</h2>
            <div className="actions">
              <button className="btn btn-gold btn-sm" onClick={() => setShowForm(true)}>+ New coupon</button>
            </div>
          </div>
          <DataTable columns={columns} rows={coupons} keyField="code"
                    emptyText={loading ? 'Loading…' : 'No coupons yet.'} />
        </div>
      </div>

      {showForm && (
        <Modal title="Create coupon" onClose={() => setShowForm(false)}>
          <form onSubmit={submit}>
            <div className="field">
              <label>Code</label>
              <input required value={form.code} placeholder="FESTIVE10"
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Type</label>
                <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </select>
              </div>
              <div className="field">
                <label>Value</label>
                <input required type="number" min="0" step="0.01" value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Min order total (₹)</label>
                <input type="number" min="0" value={form.min_order_total}
                      onChange={(e) => setForm({ ...form, min_order_total: e.target.value })} />
              </div>
              <div className="field">
                <label>Max discount (₹)</label>
                <input type="number" min="0" value={form.max_discount}
                      onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Total usage limit</label>
                <input type="number" min="0" value={form.usage_limit}
                      onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
              </div>
              <div className="field">
                <label>Per-customer limit</label>
                <input type="number" min="0" value={form.per_customer_limit}
                      onChange={(e) => setForm({ ...form, per_customer_limit: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create coupon'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
