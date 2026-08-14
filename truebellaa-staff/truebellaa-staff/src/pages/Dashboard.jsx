import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

export default function Dashboard() {
  const { staff, has } = useAuth();
  const [stats, setStats] = useState({ products: null, orders: null, pendingReviews: null, subscribers: null });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next = { products: null, orders: null, pendingReviews: null, subscribers: null };
      const tasks = [];
      if (has('product.view')) tasks.push(api.listVariants().then((r) => { next.products = r.length; }).catch(() => {}));
      if (has('order.view')) tasks.push(api.listOrders().then((r) => { next.orders = r.length; }).catch(() => {}));
      if (has('review.moderate')) tasks.push(api.listReviews('pending').then((r) => { next.pendingReviews = r.length; }).catch(() => {}));
      if (has('newsletter.manage')) tasks.push(api.listNewsletter().then((r) => { next.subscribers = r.length; }).catch(() => {}));
      if (has('audit.view')) tasks.push(api.activity(8).then((r) => { if (!cancelled) setRecent(r); }).catch(() => {}));
      await Promise.all(tasks);
      if (!cancelled) { setStats(next); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader title={`Welcome, ${staff?.name?.split(' ')[0] || 'there'}`} />
      <div className="content">
        <div className="stat-grid">
          {stats.products !== null && <StatCard label="Product variants" value={stats.products} />}
          {stats.orders !== null && <StatCard label="Recent orders" value={stats.orders} />}
          {stats.pendingReviews !== null && <StatCard label="Reviews awaiting approval" value={stats.pendingReviews} />}
          {stats.subscribers !== null && <StatCard label="Newsletter subscribers" value={stats.subscribers} />}
        </div>

        {has('audit.view') && (
          <div className="card">
            <div className="card-head"><h2>Recent activity</h2></div>
            {recent.length === 0 && !loading && <p style={{ color: 'var(--muted)', fontSize: 14 }}>No activity recorded yet.</p>}
            {recent.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0eee9', fontSize: 13.5 }}>
                <span><b>{r.event}</b>{r.detail ? ` — ${r.detail}` : ''}</span>
                <span style={{ color: 'var(--muted)' }}>{new Date(r.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <div className="card-head"><h2>Your access</h2></div>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7 }}>
            You're signed in as <b>{staff?.email}</b>. Use the left sidebar to reach the sections you
            have permission for — Admins can grant or change access under <b>Staff &amp; Roles</b>.
          </p>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
