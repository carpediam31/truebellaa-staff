import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import DataTable, { Badge } from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

/**
 * Shoppers — the people who buy. Distinct from Staff & Roles, which is
 * your own team: staff log into THIS console, customers log into the
 * storefront.
 */
export default function Customers() {
  const { has } = useAuth();
  const notify = useToast();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);

  const canBlock = has('customer.block');

  async function load(search) {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        api.listCustomers(search), api.customersSummary(),
      ]);
      setRows(list);
      setSummary(sum);
    } catch (e) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function toggleBlock(cst) {
    const next = cst.status === 'blocked' ? 'active' : 'blocked';
    try {
      await api.setCustomerStatus(cst.public_id, next);
      notify(next === 'blocked' ? `${cst.email} blocked` : `${cst.email} unblocked`);
      load(q);
    } catch (e) { notify(e.message, 'error'); }
  }

  async function openDetail(cst) {
    try { setDetail(await api.getCustomer(cst.public_id)); }
    catch (e) { notify(e.message, 'error'); }
  }

  const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const columns = [
    {
      key: 'full_name', label: 'Customer',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.full_name || '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.email}</div>
        </div>
      ),
    },
    { key: 'orders', label: 'Orders', render: (r) => r.orders || 0 },
    { key: 'total_spent', label: 'Spent', render: (r) => money(r.total_spent) },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> },
    {
      key: 'created_at', label: 'Joined',
      render: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'),
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-outline btn-sm" onClick={() => openDetail(r)}>View</button>
          {canBlock && (
            <button className={`btn btn-sm ${r.status === 'blocked' ? 'btn-gold' : 'btn-danger'}`}
                    onClick={() => toggleBlock(r)}>
              {r.status === 'blocked' ? 'Unblock' : 'Block'}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Customers" />
      <div className="content">
        {summary && (
          <div className="stat-grid">
            <div className="stat-card"><div className="label">Total customers</div><div className="value">{summary.total}</div></div>
            <div className="stat-card"><div className="label">Have ordered</div><div className="value">{summary.with_orders}</div></div>
            <div className="stat-card"><div className="label">Revenue</div><div className="value">{money(summary.revenue)}</div></div>
            <div className="stat-card"><div className="label">Blocked</div><div className="value">{summary.blocked}</div></div>
          </div>
        )}

        <div className="card">
          <div className="card-head">
            <h2>All customers</h2>
            <div className="actions">
              <input placeholder="Search name or email…" value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') load(q); }}
                    style={{ padding: '7px 11px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
              <button className="btn btn-outline btn-sm" onClick={() => load(q)}>Search</button>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
            These are shoppers on the storefront. Your own team lives under
            <b> Staff &amp; Roles</b>.
          </p>
          <DataTable columns={columns} rows={rows} keyField="public_id"
                    emptyText={loading ? 'Loading…' : 'No customers yet.'} />
        </div>
      </div>

      {detail && (
        <Modal title={detail.full_name || detail.email} onClose={() => setDetail(null)}>
          <div style={{ fontSize: 13.5, lineHeight: 1.9, marginBottom: 14 }}>
            <div><b>Email:</b> {detail.email}</div>
            <div><b>Phone:</b> {detail.phone || '—'}</div>
            <div><b>Status:</b> <Badge value={detail.status} /></div>
            <div><b>Marketing opt-in:</b> {detail.marketing_opt_in ? 'Yes' : 'No'}</div>
            <div><b>Joined:</b> {detail.created_at ? new Date(detail.created_at).toLocaleString() : '—'}</div>
            <div><b>Last login:</b> {detail.last_login_at ? new Date(detail.last_login_at).toLocaleString() : 'Never'}</div>
          </div>
          <h4 style={{ fontSize: 14, marginBottom: 8 }}>Orders ({detail.orders.length})</h4>
          {detail.orders.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>No orders yet.</p>
          )}
          {detail.orders.map((o) => (
            <div key={o.public_id} style={{ display: 'flex', justifyContent: 'space-between',
                 padding: '7px 0', borderBottom: '1px solid #f0eee9', fontSize: 13 }}>
              <span>{o.order_number}</span>
              <span><Badge value={o.status} /></span>
              <span>{money(o.total)}</span>
            </div>
          ))}
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={() => setDetail(null)}>Close</button>
          </div>
        </Modal>
      )}
    </>
  );
}
