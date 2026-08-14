import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getAccessToken, setTokens, clearTokens } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(null);   // { id, name, email, permissions }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMe = useCallback(async () => {
    if (!getAccessToken()) { setStaff(null); setLoading(false); return; }
    try {
      const me = await api.me();
      setStaff(me);
    } catch {
      clearTokens();
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  async function login(email, password) {
    setError('');
    const res = await api.staffLogin(email, password);
    setTokens(res.access_token, res.refresh_token);
    const me = await api.me();
    setStaff(me);
    return me;
  }

  async function logout() {
    await api.staffLogout();
    clearTokens();
    setStaff(null);
  }

  function has(...perms) {
    if (!staff) return false;
    return perms.every((p) => staff.permissions.includes(p));
  }
  function hasAny(...perms) {
    if (!staff) return false;
    return perms.some((p) => staff.permissions.includes(p));
  }

  return (
    <AuthContext.Provider value={{ staff, loading, error, setError, login, logout, has, hasAny }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
