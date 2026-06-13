import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { authApi, setupApi } from '../api/client';

const AuthContext = createContext(null);

/**
 * Provides authentication + setup state to the app. On mount it checks setup
 * status and (if setup is done) the current session.
 */
export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const status = await setupApi.status();
      if (status.setupRequired) {
        setSetupRequired(true);
        setUser(null);
        return;
      }
      setSetupRequired(false);
      try {
        const { user: me } = await authApi.me();
        setUser(me);
      } catch {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Redirect to login when any API call reports an unauthorized session.
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = useCallback(async (username, password) => {
    const { user: me } = await authApi.login(username, password);
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = { loading, user, setupRequired, refresh, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
