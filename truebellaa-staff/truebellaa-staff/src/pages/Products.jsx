import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import DataTable, { Badge } from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif';

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function Products() {
  const { has } = useAuth();
  const notify = useToast();
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { sku, field, value }
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [imagesFor, setImagesFor] = useState(null); // product object, or null
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const canViewProducts = has('product.view');
  const canCreateProduct = has('product.create');
  const canEditProduct = has('product.update');
  const canDeleteProduct = has('product.delete');
  const canUploadImages = has('product.image_upload');
  const canEditPrice = has('product.price_update');
  const canEditStock = has('inventory.manage');

  async function load() {
    setLoading(true);
    try {
      const [rows, prods] = await Promise.all([
        api.listVariants(),
        canViewProducts ? api.listProducts() : Promise.resolve([]),
      ]);
      setVariants(rows);
      setProducts(prods);
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

  function onProductCreated(product) {
    setShowAddProduct(false);
    notify(`Product "${product.name}" created`);
    load();
    if (canUploadImages) setImagesFor(product); // jump straight into "add images"
  }

  async function confirmDelete() {
    const p = deleting;
    try {
      await api.deleteProduct(p.public_id);
      notify(`"${p.name}" deleted`);
      setDeleting(null);
      load();
    } catch (e) { notify(e.message, 'error'); }
  }

  function onImagesChanged(updatedProduct) {
    setImagesFor(updatedProduct);
    setProducts((prev) => prev.map((p) => (p.public_id === updatedProduct.public_id ? updatedProduct : p)));
  }

  const variantColumns = [
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

  const productColumns = [
    {
      key: 'primary_image', label: '',
      render: (p) => p.primary_image
        ? <img className="thumb-cell" src={p.primary_image} alt={p.name} />
        : <div className="thumb-cell" />,
    },
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'base_price', label: 'Price (₹)', render: (p) => `₹${Number(p.base_price).toFixed(2)}` },
    { key: 'status', label: 'Status', render: (p) => <Badge value={p.status} /> },
    { key: 'image_count', label: 'Images', render: (p) => `${p.image_count} uploaded` },
    {
      key: 'actions', label: '',
      render: (p) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {canUploadImages && (
            <button className="btn btn-outline btn-sm" onClick={() => setImagesFor(p)}>Images</button>
          )}
          {canEditProduct && (
            <button className="btn btn-outline btn-sm" onClick={() => setEditingProduct(p)}>Edit</button>
          )}
          {canDeleteProduct && (
            <button className="btn btn-danger btn-sm" onClick={() => setDeleting(p)}>Delete</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Products & Stock" />
      <div className="content">
        {canViewProducts && (
          <div className="card">
            <div className="card-head">
              <h2>Products</h2>
              <div className="actions">
                <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
                {canCreateProduct && (
                  <button className="btn btn-gold btn-sm" onClick={() => setShowAddProduct(true)}>+ Add product</button>
                )}
              </div>
            </div>
            <DataTable columns={productColumns} rows={products} keyField="public_id"
                      emptyText={loading ? 'Loading…' : 'No products yet.'} />
          </div>
        )}

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
          <DataTable columns={variantColumns} rows={variants} keyField="sku"
                    emptyText={loading ? 'Loading…' : 'No products found.'} />
        </div>
      </div>

      {showAddProduct && (
        <AddProductModal onClose={() => setShowAddProduct(false)} onCreated={onProductCreated} notify={notify} />
      )}

      {imagesFor && canUploadImages && (
        <ImagesModal product={imagesFor} onClose={() => setImagesFor(null)}
                    onChanged={onImagesChanged} notify={notify} />
      )}

      {editingProduct && canEditProduct && (
        <EditProductModal product={editingProduct} notify={notify}
                         onClose={() => setEditingProduct(null)}
                         onSaved={(name) => {
                           setEditingProduct(null);
                           notify(`"${name}" updated`);
                           load();
                         }} />
      )}

      {deleting && canDeleteProduct && (
        <Modal title="Delete product" onClose={() => setDeleting(null)}>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>
            Delete <b>{deleting.name}</b>?
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
            It disappears from the storefront immediately. Past orders that
            include it are kept intact, so your order history and reports stay
            correct.
          </p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={confirmDelete}>Delete product</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function EditProductModal({ product, onClose, onSaved, notify }) {
  const [form, setForm] = useState({
    name: product.name || '',
    slug: product.slug || '',
    base_price: product.base_price ?? '',
    status: product.status || 'draft',
    sku_prefix: product.sku_prefix || '',
  });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return notify('Name is required', 'error');
    if (!form.slug.trim()) return notify('Slug is required', 'error');
    const base_price = Number(form.base_price);
    if (!(base_price >= 0)) return notify('Base price must be 0 or more', 'error');

    setSaving(true);
    try {
      await api.updateProduct(product.public_id, {
        slug: form.slug.trim(),
        sku_prefix: form.sku_prefix.trim() || null,
        base_price,
        status: form.status,
        translations: [{ locale_code: 'en', name: form.name.trim() }],
      });
      onSaved(form.name.trim());
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit — ${product.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Name</label>
          <input required autoFocus value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Slug (URL)</label>
          <input required value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
        </div>
        <div className="form-row">
          <div className="field">
            <label>Base price (₹)</label>
            <input required type="number" min="0" step="0.01" value={form.base_price}
                  onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active — visible to shoppers</option>
              <option value="draft">Draft — hidden from the store</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>SKU prefix</label>
          <input value={form.sku_prefix}
                onChange={(e) => setForm({ ...form, sku_prefix: e.target.value })} />
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: -4 }}>
          Variant prices and stock are edited in the Variants table below.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
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

const emptyProductForm = {
  name: '', slug: '', short_description: '', base_price: '', currency_code: 'INR',
  // Active + a SKU by default: that's the combination that actually puts the
  // product on the storefront and lets a customer buy it. Draft products are
  // hidden from shoppers, and without a SKU there's nothing to add to a cart.
  status: 'active', sku_prefix: '', variant_sku: '', variant_stock: '1', slugTouched: false,
};

function AddProductModal({ onClose, onCreated, notify }) {
  const [form, setForm] = useState(emptyProductForm);
  const [saving, setSaving] = useState(false);

  function setName(name) {
    setForm((f) => ({ ...f, name, slug: f.slugTouched ? f.slug : slugify(name) }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return notify('Name is required', 'error');
    if (!form.slug.trim()) return notify('Slug is required', 'error');
    if (!form.variant_sku.trim()) {
      return notify('A SKU is required — without one the product cannot be added to a cart', 'error');
    }
    const base_price = Number(form.base_price);
    if (!(base_price >= 0)) return notify('Base price must be 0 or more', 'error');

    setSaving(true);
    try {
      const payload = {
        slug: form.slug.trim(),
        sku_prefix: form.sku_prefix.trim() || null,
        base_price,
        currency_code: form.currency_code,
        status: form.status,
        translations: [{
          locale_code: 'en', name: form.name.trim(),
          short_description: form.short_description.trim() || null,
        }],
        variants: form.variant_sku.trim() ? [{
          sku: form.variant_sku.trim(), price: base_price,
          stock_on_hand: Number(form.variant_stock) || 0, is_default: true,
        }] : [],
      };
      const product = await api.createProduct(payload);
      onCreated(product);
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add product" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Name</label>
          <input required autoFocus value={form.name} placeholder="Silver Chain Necklace"
                onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Slug (URL)</label>
          <input required value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value), slugTouched: true })} />
        </div>
        <div className="field">
          <label>Short description</label>
          <input value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="field">
            <label>Base price (₹)</label>
            <input required type="number" min="0" step="0.01" value={form.base_price}
                  onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active — visible to shoppers</option>
              <option value="draft">Draft — hidden from the store</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>SKU prefix</label>
            <input value={form.sku_prefix} placeholder="optional"
                  onChange={(e) => setForm({ ...form, sku_prefix: e.target.value })} />
          </div>
          <div className="field">
            <label>Default variant SKU</label>
            <input required value={form.variant_sku} placeholder="e.g. NECK-SLV-20"
                  onChange={(e) => setForm({ ...form, variant_sku: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Starting stock</label>
          <input type="number" min="0" value={form.variant_stock}
                onChange={(e) => setForm({ ...form, variant_stock: e.target.value })} />
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: -4, marginBottom: 4 }}>
          A product needs a SKU and stock above 0 before anyone can buy it.
          You'll upload photos right after creating it.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ImagesModal({ product, onClose, onChanged, notify }) {
  const [images, setImages] = useState(product.images || []);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef(null);

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    let latest = { ...product, images };
    try {
      for (const file of files) {
        // `latest`, not the `images` state — state doesn't update between
        // iterations, so using it here would mark every file in a multi-file
        // drop as primary and leave the LAST one primary instead of the first.
        const img = await api.uploadProductImage(product.public_id, file,
          { isPrimary: latest.images.length === 0 });
        const nextImages = [...latest.images, img];
        latest = { ...latest, images: nextImages, image_count: nextImages.length,
                  primary_image: nextImages.find((i) => i.is_primary)?.url || latest.primary_image };
        setImages(nextImages);
      }
      notify(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`);
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      // Always push up whatever DID upload — a failure partway through a
      // multi-file drop shouldn't leave the product list showing stale counts.
      onChanged(latest);
      setUploading(false);
    }
  }

  async function removeImage(imageId) {
    try {
      await api.deleteProductImage(product.public_id, imageId);
      const nextImages = images.filter((i) => i.id !== imageId);
      setImages(nextImages);
      onChanged({ ...product, images: nextImages, image_count: nextImages.length,
                 primary_image: nextImages[0]?.url || null });
      notify('Image removed');
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  return (
    <Modal title={`Images — ${product.name}`} onClose={onClose}>
      <div className={`dropzone${dragOver ? ' drag-over' : ''}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}>
        {uploading ? 'Uploading…' : 'Click or drop JPG / PNG / WEBP / GIF images here (max 8MB each)'}
        <input ref={fileInput} type="file" accept={ACCEPTED_TYPES} multiple
              onChange={(e) => uploadFiles(e.target.files)} />
      </div>

      <div className="img-grid">
        {images.map((img) => (
          <div className="img-thumb" key={img.id}>
            {img.is_primary && <span className="primary-tag">Primary</span>}
            <button type="button" className="remove" onClick={() => removeImage(img.id)} title="Remove">×</button>
            <img src={img.url} alt={img.alt_text || product.name} />
            <div className="meta">
              <strong>{img.file_extension || '—'}</strong> · {formatSize(img.file_size_bytes)}
            </div>
          </div>
        ))}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
