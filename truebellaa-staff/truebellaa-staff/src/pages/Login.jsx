import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { staff, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (staff) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (ex) {
      setErr(ex.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="logo">True<strong>Bellaa</strong></div>
        <p>Staff console for the Admin, Operations Manager and Marketing &amp; Sales teams.
           Sign in with the login your Admin gave you.</p>
        <div className="tag">
          <span>Admin</span><span>Manager</span><span>Sales</span>
        </div>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={onSubmit}>
          <h2>Staff sign in</h2>
          <p className="sub">Use your work email and the password your Admin set up.</p>
          {err && <div className="error-box">{err}</div>}
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} autoFocus
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@truebellaa.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="hint">
            New to the team? Staff accounts aren't self-service — ask an <b>Admin</b> to create
            one for you from <b>Staff &amp; Roles → Add Staff</b> after they sign in.
          </p>
        </form>
      </div>
    </div>
  );
}
