import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import DataTable, { Badge } from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

const STATUSES = ['', 'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned'];

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const pretty = (s) => String(s || '').replace(/_/g, ' ');

export default function Orders() {
  const { has } = useAuth();
  const notify = useToast();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);   // { kind, order }
  const [note, setNote] = useState('');

  const canShip = has('shipment.create');
  const canStatus = has('order.update_status');
  const canCancel = has('order.cancel');
  const canRefund = has('order.refund');

  async function load(s = status) {
    setLoading(true);
    try { setOrders(await api.listOrders(s || undefined)); }
    catch (e) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function openDetail(publicId) {
    try { setDetail(await api.getOrder(publicId)); }
    catch (e) { notify(e.message, 'error'); }
  }

  async function ship(publicId) {
    setBusy(publicId);
    try {
      const res = await api.shipOrder(publicId);
      if (res.awb_code) {
        notify(`Shipped — AWB ${res.awb_code} via ${res.courier}`);
      } else {
        // Shiprocket can create the order and still refuse a courier
        // (an empty wallet does this). Say so rather than implying success.
        notify(res.warning || 'Order sent to Shiprocket, but no courier was assigned', 'error');
      }
      load();
      if (detail) openDetail(publicId);
    } catch (e) { notify(e.message, 'error'); }
    finally { setBusy(null); }
  }

  async function moveTo(publicId, next) {
    setBusy(publicId);
    try {
      await api.setOrderStatus(publicId, next);
      notify(`Order moved to ${pretty(next)}`);
      load();
      if (detail) openDetail(publicId);
    } catch (e) { notify(e.message, 'error'); }
    finally { setBusy(null); }
  }

  async function runConfirm() {
    const { kind, order } = confirm;
    setBusy(order.public_id);
    try {
      if (kind === 'cancel') {
        await api.cancelOrder(order.public_id, note || undefined);
        notify(`${order.order_number} cancelled — stock returned`);
      } else {
        const res = await api.refundOrder(order.public_id, note || undefined);
        notify(res.reminder || `${order.order_number} marked refunded`);
      }
      setConfirm(null); setNote('');
      load();
      if (detail) openDetail(order.public_id);
    } catch (e) { notify(e.message, 'error'); }
    finally { setBusy(null); }
  }

  const columns = [
    { key: 'order_number', label: 'Order #' },
    { key: 'email', label: 'Customer' },
    { key: 'grand_total', label: 'Total', render: (r) => money(r.grand_total) },
    { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> },
    { key: 'placed_at', label: 'Placed', render: (r) => (r.placed_at ? new Date(r.placed_at).toLocaleString() : '—') },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline btn-sm" onClick={() => openDetail(r.public_id)}>View</button>
          {canShip && (r.status === 'paid' || r.status === 'processing') && (
            <button className="btn btn-gold btn-sm" disabled={busy === r.public_id}
                    onClick={() => ship(r.public_id)}>
              {busy === r.public_id ? 'Shipping…' : 'Ship'}
            </button>
          )}
        </div>
      ),
    },
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
                {STATUSES.map((s) => <option key={s} value={s}>{s ? pretty(s) : 'All statuses'}</option>)}
              </select>
              <button className="btn btn-outline btn-sm" onClick={() => load()}>Refresh</button>
            </div>
          </div>
          <DataTable columns={columns} rows={orders} keyField="order_number"
                    emptyText={loading ? 'Loading…' : 'No orders found.'} />
        </div>
      </div>

      {detail && (
        <Modal title={`${detail.order_number} — ${pretty(detail.status)}`} onClose={() => setDetail(null)}>
          <div style={{ fontSize: 13.5, lineHeight: 1.85, marginBottom: 14 }}>
            <div><b>Customer:</b> {detail.email} · {detail.phone}</div>
            <div><b>Ship to:</b> {detail.shipping?.name}, {detail.shipping?.line1}, {detail.shipping?.city} {detail.shipping?.pin}</div>
            <div><b>Total:</b> {money(detail.grand_total)}</div>
          </div>

          <h4 style={{ fontSize: 14, margin: '14px 0 6px' }}>Items</h4>
          {detail.items.map((i) => (
            <div key={i.sku} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0' }}>
              <span>{i.name} × {i.qty}</span><span>{money(i.line_total)}</span>
            </div>
          ))}

          {detail.shipment && (
            <>
              <h4 style={{ fontSize: 14, margin: '16px 0 6px' }}>Shipment</h4>
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div><b>AWB:</b> {detail.shipment.awb_code || <span style={{ color: 'var(--danger)' }}>not assigned yet</span>}</div>
                <div><b>Courier:</b> {detail.shipment.courier || '—'}</div>
                {detail.shipment.tracking_url && (
                  <a href={detail.shipment.tracking_url} target="_blank" rel="noreferrer"
                     style={{ color: 'var(--gold-dark)', textDecoration: 'underline' }}>Track parcel</a>
                )}
              </div>
            </>
          )}

          <h4 style={{ fontSize: 14, margin: '16px 0 6px' }}>History</h4>
          {detail.history.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>No changes yet.</p>}
          {detail.history.map((h, i) => (
            <div key={i} style={{ fontSize: 12.5, color: 'var(--muted)', padding: '3px 0' }}>
              {pretty(h.from) || 'created'} → <b style={{ color: 'var(--text)' }}>{pretty(h.to)}</b>
              {h.note ? ` — ${h.note}` : ''} · {h.at ? new Date(h.at).toLocaleString() : ''}
            </div>
          ))}

          {/* Only transitions the backend actually allows are offered, so
              the UI can never present a move that will be rejected. */}
          {canStatus && detail.next_statuses.length > 0 && (
            <>
              <h4 style={{ fontSize: 14, margin: '16px 0 8px' }}>Move to</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {detail.next_statuses.filter((s) => s !== 'cancelled' && s !== 'refunded').map((s) => (
                  <button key={s} className="btn btn-outline btn-sm" disabled={busy === detail.public_id}
                          onClick={() => moveTo(detail.public_id, s)}>{pretty(s)}</button>
                ))}
              </div>
            </>
          )}

          <div className="modal-actions">
            {canCancel && detail.next_statuses.includes('cancelled') && (
              <button className="btn btn-danger" onClick={() => { setConfirm({ kind: 'cancel', order: detail }); setNote(''); }}>
                Cancel order
              </button>
            )}
            {canRefund && detail.next_statuses.includes('refunded') && (
              <button className="btn btn-danger" onClick={() => { setConfirm({ kind: 'refund', order: detail }); setNote(''); }}>
                Refund
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setDetail(null)}>Close</button>
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal title={confirm.kind === 'cancel' ? 'Cancel order' : 'Refund order'} onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, lineHeight: 1.7 }}>
            {confirm.kind === 'cancel' ? (
              <>Cancel <b>{confirm.order.order_number}</b>? The items go back into stock
                 and the order cannot be reopened.</>
            ) : (
              <>Mark <b>{confirm.order.order_number}</b> as refunded?</>
            )}
          </p>
          {confirm.kind === 'refund' && (
            <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 10, lineHeight: 1.6 }}>
              This only records the refund here. You still have to return the money
              in the Razorpay dashboard.
            </p>
          )}
          <div className="field" style={{ marginTop: 14 }}>
            <label>Reason (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder={confirm.kind === 'cancel' ? 'e.g. customer changed their mind' : 'e.g. damaged on arrival'} />
          </div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setConfirm(null)}>Back</button>
            <button className="btn btn-danger" disabled={busy} onClick={runConfirm}>
              {busy ? 'Working…' : confirm.kind === 'cancel' ? 'Cancel order' : 'Mark refunded'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
