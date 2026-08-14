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
    { to: '/orders', label: 'Orders & Shipping', perms: ['order.view'] },
    { to: '/coupons', label: 'Coupons', perms: ['coupon.manage'] },
    { to: '/newsletter', label: 'Newsletter List', perms: ['newsletter.manage'] },
    { to: '/reviews', label: 'Reviews', perms: ['review.moderate'] },
  ]},
  { section: 'Administration', items: [
    { to: '/users', label: 'Staff & Roles', perms: ['user.manage'] },
    { to: '/permissions', label: 'Roles & Permissions', perms: ['role.manage'] },
    { to: '/activity', label: 'Activity Log', perms: ['audit.view'] },
  ]},
];

export default function Layout() {
  const { staff, has, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">True<strong>Bellaa</strong></div>
        <nav>
          {NAV.map((group) => {
            const visible = group.items.filter((i) => !i.perms.length || has(...i.perms));
            if (!visible.length) return null;
            return (
              <div key={group.section}>
                <div className="navlabel">{group.section}</div>
                {visible.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'}
                    className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>
                    <span className="dot" />{item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="who">
          <div className="name">{staff?.name}</div>
          <div className="role">{staff?.email}</div>
          <button onClick={handleLogout}>Sign out</button>
        </div>
      </aside>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}

export function PageHeader({ title, children }) {
  return (
    <div className="topbar">
      <h1>{title}</h1>
      <div>{children}</div>
    </div>
  );
}
