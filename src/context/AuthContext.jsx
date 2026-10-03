import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((u) => {
        if (active) setUser(u);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    const u = await api.login(email, password);
    setUser(u);
    return u;
  };

  const register = async (data) => {
    const u = await api.register(data);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const updateProfile = async (data) => {
    const u = await api.updateProfile(data);
    setUser((prev) => ({ ...prev, ...u }));
    return u;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
