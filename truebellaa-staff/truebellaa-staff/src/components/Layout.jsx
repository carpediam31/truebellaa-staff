import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { section: 'Overview', items: [
    { to: '/', label: 'Dashboard', perms: [] },
  ]},
  { section: 'Catalogue', items: [
    { to: '/products', label: 'Products & Stock', perms: ['product.view'] },
  ]},
  { section: 'Sales', items: [
    { to: '/customers', label: 'Customers', perms: ['customer.view'] },
    { to: '/orders', label: 'Orders & Shipping', perms: ['order.view'] },
    { to: '/coupons', label: 'Coupons', perms: ['coupon.manage'] },
    { to: '/newsletter', label: 'Newsletter List', perms: ['newsletter.manage'] },
    { to: '/reviews', label: 'Reviews', perms: ['review.moderate'] },
  ]},
  { section: 'Administration', items: [
    { to: '/users', label: 'Staff & Roles', perms: ['user.manage'] },
    { to: '/permissions', label: 'Roles & Permissions', perms: ['role.manage'] },
    { to: '/email-templates', label: 'Email Templates', perms: ['settings.manage'] },
    { to: '/settings', label: 'Settings', perms: ['settings.manage'] },
    { to: '/activity', label: 'Activity Log', perms: ['audit.view'] },
  ]},
];

/**
 * Lets each page hand its own logout handler to the header's account menu,
 * so the menu lives in the top bar (where people look for it) while the
 * layout still owns the actual navigation.
 */
const LayoutCtx = createContext({ onLogout: () => {} });

function initials(name, email) {
  const src = (name || email || '?').trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || src[0].toUpperCase();
}

export default function Layout() {
  const { staff, has, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <LayoutCtx.Provider value={{ onLogout: handleLogout, staff }}>
      <div className="app-shell">
        <aside className={`sidebar${mobileNav ? ' open' : ''}`}>
          <div className="brand">True<strong>Bellaa</strong></div>
          <nav>
            {NAV.map((group) => {
              const visible = group.items.filter((i) => !i.perms.length || has(...i.perms));
              if (!visible.length) return null;
              return (
                <div className="navgroup" key={group.section}>
                  <div className="navlabel">{group.section}</div>
                  {visible.map((item) => (
                    <NavLink key={item.to} to={item.to} end={item.to === '/'}
                      onClick={() => setMobileNav(false)}
                      className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>
                      <span className="dot" />{item.label}
                    </NavLink>
                  ))}
                </div>
              );
            })}
          </nav>
          <div className="sidebar-foot">TrueBellaa Staff Console</div>
        </aside>

        {mobileNav && <div className="nav-scrim" onClick={() => setMobileNav(false)} />}

        <div className="main">
          <Outlet context={{ onMenu: () => setMobileNav(true) }} />
        </div>
      </div>
    </LayoutCtx.Provider>
  );
}

/** The account chip + Logout, shown on the right of every page header. */
function AccountMenu() {
  const { onLogout } = useContext(LayoutCtx);
  const { staff } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click and on Escape — a menu you can't dismiss is worse
  // than no menu.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!staff) return null;

  return (
    <div className="acct" ref={ref}>
      <button className="acct-trigger" onClick={() => setOpen((o) => !o)}
              title={staff.email} aria-haspopup="menu" aria-expanded={open}>
        <span className="acct-avatar">{initials(staff.name, staff.email)}</span>
        <span className="acct-meta">
          <span className="acct-name">{staff.name || staff.email}</span>
          <span className="acct-email">{staff.email}</span>
        </span>
        <span className={`acct-caret${open ? ' up' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="acct-menu" role="menu">
          <div className="acct-menu-head">
            <div className="acct-name">{staff.name || 'Staff'}</div>
            <div className="acct-email">{staff.email}</div>
          </div>
          <button className="acct-logout" onClick={onLogout} role="menuitem">Logout</button>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, children }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <h1>{title}</h1>
      </div>
      <div className="topbar-right">
        {children}
        <AccountMenu />
      </div>
    </div>
  );
}
