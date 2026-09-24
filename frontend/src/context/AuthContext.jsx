import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('epr_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useCallback(async (employeeId, phoneNumber, password) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.post('/auth/login', { employeeId, phoneNumber, password });
      localStorage.setItem('epr_token', data.token);
      localStorage.setItem('epr_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('epr_token');
    localStorage.removeItem('epr_user');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout, loading, error }), [user, login, logout, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
