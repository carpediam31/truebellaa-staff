import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import DataTable, { Badge } from '../components/DataTable.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: '', label: 'All' },
];

export default function Reviews() {
  const notify = useToast();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load(t = tab) {
    setLoading(true);
    try { setRows(await api.listReviews(t || undefined)); }
    catch (e) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function moderate(id, status) {
    setBusyId(id);
    try {
      await api.moderateReview(id, status);
      notify(`Review ${status}`);
      load();
    } catch (e) { notify(e.message, 'error'); }
    finally { setBusyId(null); }
  }

  const columns = [
    { key: 'product_name', label: 'Product', render: (r) => r.product_name || r.product_slug },
    { key: 'rating', label: 'Rating', render: (r) => '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) },
    { key: 'title', label: 'Title', render: (r) => r.title || '—' },
    { key: 'body', label: 'Comment', render: (r) => <span style={{ display: 'inline-block', maxWidth: 280 }}>{r.body || '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> },
    {
      key: 'actions', label: '',
      render: (r) => (
        r.status === 'pending' ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-gold btn-sm" disabled={busyId === r.id} onClick={() => moderate(r.id, 'approved')}>Approve</button>
            <button className="btn btn-danger btn-sm" disabled={busyId === r.id} onClick={() => moderate(r.id, 'rejected')}>Reject</button>
          </div>
        ) : <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>—</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Reviews" />
      <div className="content">
        <div className="card">
          <div className="card-head"><h2>Product reviews</h2></div>
          <div className="pill-tabs">
            {TABS.map((t) => (
              <button key={t.key} className={tab === t.key ? 'active' : ''}
                      onClick={() => { setTab(t.key); load(t.key); }}>{t.label}</button>
            ))}
          </div>
          <DataTable columns={columns} rows={rows} keyField="id"
                    emptyText={loading ? 'Loading…' : 'No reviews here.'} />
        </div>
      </div>
    </>
  );
}
