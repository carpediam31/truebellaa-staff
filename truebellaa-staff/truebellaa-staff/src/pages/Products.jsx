import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import DataTable from '../components/DataTable.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

export default function Products() {
  const { has } = useAuth();
  const notify = useToast();
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { sku, field, value }

  const canEditPrice = has('product.price_update');
  const canEditStock = has('inventory.manage');

  async function load() {
    setLoading(true);
    try {
      const rows = await api.listVariants();
      setVariants(rows);
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function savePrice(sku, value) {
    const price = Number(value);
    if (!(price > 0)) return notify('Price must be greater than 0', 'error');
    try {
      await api.updatePrice(sku, price);
      notify(`Price updated for ${sku}`);
      setEditing(null);
      load();
    } catch (e) { notify(e.message, 'error'); }
  }

  async function saveStock(sku, value) {
    const stock = Number(value);
    if (!(stock >= 0)) return notify('Stock cannot be negative', 'error');
    try {
      await api.updateStock(sku, stock, 'adjustment');
      notify(`Stock updated for ${sku}`);
      setEditing(null);
      load();
    } catch (e) { notify(e.message, 'error'); }
  }

  const columns = [
    { key: 'sku', label: 'SKU' },
    {
      key: 'price', label: 'Price (₹)',
      render: (row) => {
        const isEditing = editing?.sku === row.sku && editing?.field === 'price';
        if (!canEditPrice) return `₹${Number(row.price).toFixed(2)}`;
        if (isEditing) {
          return (
            <EditCell defaultValue={row.price} onCancel={() => setEditing(null)}
                      onSave={(v) => savePrice(row.sku, v)} />
          );
        }
        return (
          <button className="btn btn-outline btn-sm" onClick={() => setEditing({ sku: row.sku, field: 'price' })}>
            ₹{Number(row.price).toFixed(2)} — edit
          </button>
        );
      },
    },
    {
      key: 'stock_available', label: 'Stock available',
      render: (row) => {
        const isEditing = editing?.sku === row.sku && editing?.field === 'stock';
        if (!canEditStock) return row.stock_available;
        if (isEditing) {
          return (
            <EditCell defaultValue={row.stock_available} onCancel={() => setEditing(null)}
                      onSave={(v) => saveStock(row.sku, v)} />
          );
        }
        return (
          <button className="btn btn-outline btn-sm" onClick={() => setEditing({ sku: row.sku, field: 'stock' })}>
            {row.stock_available} — edit
          </button>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title="Products & Stock" />
      <div className="content">
        <div className="card">
          <div className="card-head">
            <h2>Variants</h2>
            <div className="actions"><button className="btn btn-outline btn-sm" onClick={load}>Refresh</button></div>
          </div>
          {!canEditPrice && !canEditStock && (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
              You have view-only access. Ask an Admin or Manager for edit permissions.
            </p>
          )}
          <DataTable columns={columns} rows={variants} keyField="sku"
                    emptyText={loading ? 'Loading…' : 'No products found.'} />
        </div>
      </div>
    </>
  );
}

function EditCell({ defaultValue, onSave, onCancel }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="inline-edit">
      <input autoFocus type="number" value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn btn-gold btn-sm" onClick={() => onSave(value)}>Save</button>
      <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
    </div>
  );
}
