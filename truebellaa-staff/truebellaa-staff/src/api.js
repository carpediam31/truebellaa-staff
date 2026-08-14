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

  // ---- audit ----
  activity: (limit = 50) => req(`/admin/activity?limit=${limit}`),
};

export { API_BASE, TENANT };
