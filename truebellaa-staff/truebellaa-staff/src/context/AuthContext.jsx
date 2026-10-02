import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getAccessToken, getRefreshToken, setTokens, clearTokens } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(null);   // { id, name, email, permissions }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMe = useCallback(async () => {
    // An access token can be absent or expired while the (much longer-lived)
    // refresh token is still good, so don't give up before trying it.
    if (!getAccessToken() && !getRefreshToken()) {
      setStaff(null); setLoading(false); return;
    }
    try {
      const me = await api.me();
      setStaff(me);
    } catch (e) {
      // Only a definitive auth rejection should log the user out. A network
      // blip or a 5xx (e.g. the API restarting) used to wipe the tokens here,
      // which is why a backend restart forced a fresh login every time.
      if (e.status === 401 || e.status === 403) {
        clearTokens();
        setStaff(null);
      } else {
        setError('Could not reach the server — retrying in the background.');
      }
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
