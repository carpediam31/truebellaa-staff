import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import DataTable, { Badge } from '../components/DataTable.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

export default function Newsletter() {
  const notify = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setRows(await api.listNewsletter()); }
    catch (e) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function exportCsv() {
    const header = 'email,status,locale,subscribed_at\n';
    const body = rows.map((r) => `${r.email},${r.status},${r.locale_code || ''},${r.created_at || ''}`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'newsletter_subscribers.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'locale_code', label: 'Language', render: (r) => r.locale_code || '—' },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> },
    { key: 'created_at', label: 'Subscribed', render: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—') },
  ];

  return (
    <>
      <PageHeader title="Newsletter List" />
      <div className="content">
        <div className="card">
          <div className="card-head">
            <h2>Subscribers ({rows.length})</h2>
            <div className="actions">
              <button className="btn btn-outline btn-sm" onClick={exportCsv}>Export CSV</button>
              <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
            </div>
          </div>
          <DataTable columns={columns} rows={rows} keyField="email"
                    emptyText={loading ? 'Loading…' : 'No subscribers yet.'} />
        </div>
      </div>
    </>
  );
}
