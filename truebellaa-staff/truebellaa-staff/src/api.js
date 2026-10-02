// ---------------------------------------------------------------------
//  API client — the single place the staff console talks to the backend.
//  Change the base URL / tenant with a .env file (see .env.example):
//     VITE_API_BASE=https://api.yourdomain.com/api/v1
//     VITE_TENANT_SLUG=truebellaa
// ---------------------------------------------------------------------

const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8000/api/v1';
const TENANT =
  (import.meta.env && import.meta.env.VITE_TENANT_SLUG) || 'truebellaa';

const TOKEN_KEY = 'tb_staff_access';
const REFRESH_KEY = 'tb_staff_refresh';

export function getAccessToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
export function getRefreshToken() {
  try { return localStorage.getItem(REFRESH_KEY) || ''; } catch { return ''; }
}
export function setTokens(access, refresh) {
  try {
    localStorage.setItem(TOKEN_KEY, access || '');
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  } catch { /* ignore */ }
}
export function clearTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch { /* ignore */ }
}

function headers(withAuth = true) {
  const h = { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT };
  const token = getAccessToken();
  if (withAuth && token) h.Authorization = `Bearer ${token}`;
  return h;
}

let refreshing = null;

async function tryRefresh() {
  const refresh_token = getRefreshToken();
  if (!refresh_token) return false;
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/auth/staff/refresh`, {
      method: 'POST',
      headers: headers(false),
      body: JSON.stringify({ refresh_token }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.access_token) {
          setTokens(data.access_token, refresh_token);
          return true;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

async function req(path, opts = {}, _retried = false) {
  const res = await fetch(`${API_BASE}${path}`, { headers: headers(), ...opts });
  if (res.status === 401 && !_retried && getRefreshToken()) {
    const ok = await tryRefresh();
    if (ok) return req(path, opts, true);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch { /* ignore */ }
    const err = new Error(typeof detail === 'string' ? detail : 'Request failed');
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// Like req(), but for multipart/form-data uploads — no Content-Type header
// (the browser sets the multipart boundary itself) and no JSON body.
async function upload(path, formData, _retried = false) {
  const h = { 'X-Tenant-Slug': TENANT };
  const token = getAccessToken();
  if (token) h.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: h, body: formData });
  if (res.status === 401 && !_retried && getRefreshToken()) {
    const ok = await tryRefresh();
    if (ok) return upload(path, formData, true);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch { /* ignore */ }
    const err = new Error(typeof detail === 'string' ? detail : 'Upload failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  // ---- auth ----
  staffLogin: (email, password) =>
    req('/auth/staff/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  staffLogout: () => {
    const refresh_token = getRefreshToken();
    return req('/auth/staff/logout', { method: 'POST', body: JSON.stringify({ refresh_token }) })
      .catch(() => {});
  },
  me: () => req('/auth/staff/me'),

  // ---- users / registration (Admin) ----
  listRoles: () => req('/admin/roles'),
  listUsers: () => req('/admin/users'),
  createStaff: (payload) => req('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  setStaffStatus: (publicId, status) =>
    req(`/admin/users/${encodeURIComponent(publicId)}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),
  setStaffRole: (publicId, role_code) =>
    req(`/admin/users/${encodeURIComponent(publicId)}/role`, {
      method: 'PATCH', body: JSON.stringify({ role_code }),
    }),

  // ---- roles & permissions matrix (Admin) ----
  listPermissions: () => req('/admin/permissions'),
  getRolePermissions: (code) => req(`/admin/roles/${encodeURIComponent(code)}/permissions`),
  setRolePermissions: (code, permission_codes) =>
    req(`/admin/roles/${encodeURIComponent(code)}/permissions`, {
      method: 'PUT', body: JSON.stringify({ permission_codes }),
    }),

  // ---- catalog (Manager / Admin) ----
  listProducts: () => req('/admin/products'),
  createProduct: (payload) => req('/admin/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (publicId, payload) =>
    req(`/admin/products/${encodeURIComponent(publicId)}`, {
      method: 'PATCH', body: JSON.stringify(payload),
    }),
  deleteProduct: (publicId) =>
    req(`/admin/products/${encodeURIComponent(publicId)}`, { method: 'DELETE' }),
  uploadProductImage: (publicId, file, { altText, isPrimary } = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    if (altText) fd.append('alt_text', altText);
    fd.append('is_primary', isPrimary ? 'true' : 'false');
    return upload(`/admin/products/${encodeURIComponent(publicId)}/images`, fd);
  },
  deleteProductImage: (publicId, imageId) =>
    req(`/admin/products/${encodeURIComponent(publicId)}/images/${imageId}`, { method: 'DELETE' }),
  listVariants: () => req('/admin/variants'),
  updatePrice: (sku, price) =>
    req(`/admin/variants/${encodeURIComponent(sku)}/price`, {
      method: 'PATCH', body: JSON.stringify({ price }),
    }),
  updateStock: (sku, stock_on_hand, reason = 'adjustment') =>
    req(`/admin/variants/${encodeURIComponent(sku)}/stock`, {
      method: 'PATCH', body: JSON.stringify({ stock_on_hand, reason }),
    }),
  priceHistory: (sku) => req(`/admin/variants/${encodeURIComponent(sku)}/price-history`),

  // ---- orders (Manager / Sales / Admin) ----
  listOrders: (status) => req(`/admin/orders${status ? `?status=${status}` : ''}`),
  getOrder: (publicId) => req(`/admin/orders/${encodeURIComponent(publicId)}`),
  setOrderStatus: (publicId, status, note) =>
    req(`/admin/orders/${encodeURIComponent(publicId)}/status`, {
      method: 'PATCH', body: JSON.stringify({ status, note }),
    }),
  cancelOrder: (publicId, note) =>
    req(`/admin/orders/${encodeURIComponent(publicId)}/cancel`, {
      method: 'POST', body: JSON.stringify({ note }),
    }),
  refundOrder: (publicId, note) =>
    req(`/admin/orders/${encodeURIComponent(publicId)}/refund`, {
      method: 'POST', body: JSON.stringify({ note }),
    }),
  shipOrder: (publicId) => req(`/admin/orders/${encodeURIComponent(publicId)}/ship`, { method: 'POST' }),

  // ---- marketing / sales ----
  listCoupons: () => req('/admin/coupons'),
  createCoupon: (payload) => req('/admin/coupons', { method: 'POST', body: JSON.stringify(payload) }),
  setCouponStatus: (code, is_active) =>
    req(`/admin/coupons/${encodeURIComponent(code)}/status`, {
      method: 'PATCH', body: JSON.stringify({ is_active }),
    }),
  listNewsletter: () => req('/admin/newsletter'),
  listReviews: (status) => req(`/admin/reviews${status ? `?status=${status}` : ''}`),
  moderateReview: (id, status) =>
    req(`/admin/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // ---- customers (shoppers, not staff) ----
  listCustomers: (q) => req(`/admin/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  customersSummary: () => req('/admin/customers/summary'),
  getCustomer: (publicId) => req(`/admin/customers/${encodeURIComponent(publicId)}`),
  setCustomerStatus: (publicId, status) =>
    req(`/admin/customers/${encodeURIComponent(publicId)}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),

  // ---- runtime settings (Admin) ----
  listSettings: () => req('/admin/settings'),
  updateSettings: (values) => req('/admin/settings', { method: 'PUT', body: JSON.stringify({ values }) }),

  // ---- email templates (Admin) ----
  listEmailTemplates: () => req('/admin/email-templates'),
  updateEmailTemplate: (code, payload) =>
    req(`/admin/email-templates/${encodeURIComponent(code)}`, {
      method: 'PUT', body: JSON.stringify(payload),
    }),
  previewEmailTemplate: (code, payload) =>
    req(`/admin/email-templates/${encodeURIComponent(code)}/preview`, {
      method: 'POST', body: JSON.stringify(payload || null),
    }),
  testSendEmailTemplate: (code, payload) =>
    req(`/admin/email-templates/${encodeURIComponent(code)}/test-send`, {
      method: 'POST', body: JSON.stringify(payload),
    }),

  // ---- audit ----
  activity: (limit = 50) => req(`/admin/activity?limit=${limit}`),
};

export { API_BASE, TENANT };
