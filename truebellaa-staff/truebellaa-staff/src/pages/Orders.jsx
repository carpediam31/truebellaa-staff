import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import DataTable, { Badge } from '../components/DataTable.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

const STATUSES = ['', 'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function Orders() {
  const { has } = useAuth();
  const notify = useToast();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState(null);

  const canShip = has('shipment.create');

  async function load(s = status) {
    setLoading(true);
    try {
      const rows = await api.listOrders(s || undefined);
      setOrders(rows);
    } catch (e) { notify(e.message, 'error'); } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function ship(publicId) {
    setShipping(publicId);
    try {
      const res = await api.shipOrder(publicId);
      notify(`Shipment created — AWB ${res.awb_code}`);
      load();
    } catch (e) { notify(e.message, 'error'); } finally { setShipping(null); }
  }

  const columns = [
    { key: 'order_number', label: 'Order #' },
    { key: 'email', label: 'Customer' },
    { key: 'grand_total', label: 'Total', render: (r) => `₹${Number(r.grand_total).toFixed(2)}` },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> },
    { key: 'placed_at', label: 'Placed', render: (r) => (r.placed_at ? new Date(r.placed_at).toLocaleString() : '—') },
    ...(canShip ? [{
      key: 'actions', label: '',
      render: (r) => (
        r.status === 'paid'
          ? <button className="btn btn-gold btn-sm" disabled={shipping === r.public_id}
                    onClick={() => ship(r.public_id)}>
              {shipping === r.public_id ? 'Shipping…' : 'Ship order'}
            </button>
          : <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>—</span>
      ),
    }] : []),
  ];

  return (
    <>
      <PageHeader title="Orders & Shipping" />
      <div className="content">
        <div className="card">
          <div className="card-head">
            <h2>Orders</h2>
            <div className="actions">
              <select value={status} onChange={(e) => { setStatus(e.target.value); load(e.target.value); }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All statuses'}</option>)}
              </select>
              <button className="btn btn-outline btn-sm" onClick={() => load()}>Refresh</button>
            </div>
          </div>
          <DataTable columns={columns} rows={orders} keyField="order_number"
                    emptyText={loading ? 'Loading…' : 'No orders found.'} />
        </div>
      </div>
    </>
  );
}
