import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import DataTable from '../components/DataTable.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

export default function Activity() {
  const notify = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);

  async function load(l = limit) {
    setLoading(true);
    try { setRows(await api.activity(l)); }
    catch (e) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const columns = [
    { key: 'created_at', label: 'When', render: (r) => new Date(r.created_at).toLocaleString() },
    { key: 'actor_type', label: 'Actor type' },
    { key: 'actor_id', label: 'Actor ID', render: (r) => r.actor_id ?? '—' },
    { key: 'event', label: 'Event' },
    { key: 'detail', label: 'Detail', render: (r) => r.detail || '—' },
  ];

  return (
    <>
      <PageHeader title="Activity Log" />
      <div className="content">
        <div className="card">
          <div className="card-head">
            <h2>Audit trail — logins, logouts, price & stock changes, and more</h2>
            <div className="actions">
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); load(Number(e.target.value)); }}>
                <option value={50}>Last 50</option>
                <option value={100}>Last 100</option>
                <option value={200}>Last 200</option>
              </select>
              <button className="btn btn-outline btn-sm" onClick={() => load()}>Refresh</button>
            </div>
          </div>
          <DataTable columns={columns} rows={rows} keyField="created_at"
                    emptyText={loading ? 'Loading…' : 'No activity recorded yet.'} />
        </div>
      </div>
    </>
  );
}
