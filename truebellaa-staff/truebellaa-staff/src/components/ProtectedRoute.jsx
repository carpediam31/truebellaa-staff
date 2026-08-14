import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/** Wrap a route: requires login, and optionally ALL of `perms`. */
export default function ProtectedRoute({ perms = [], children }) {
  const { staff, loading, has } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!staff) return <Navigate to="/login" state={{ from: location }} replace />;
  if (perms.length && !has(...perms)) return <Navigate to="/forbidden" replace />;
  return children;
}
