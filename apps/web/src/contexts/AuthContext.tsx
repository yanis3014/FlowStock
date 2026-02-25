import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiFetch, refreshCsrf } from '@/lib/api';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Tenant {
  id: string;
  company_name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company_name: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    const tenant = localStorage.getItem('tenant');
    if (token && user && tenant) {
      setState({
        user: JSON.parse(user),
        tenant: JSON.parse(tenant),
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await refreshCsrf();
    const res = await apiFetch<{
      success: boolean;
      data: { user: User; tenant: Tenant; access_token: string; refresh_token: string };
    }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    const { user, tenant, access_token, refresh_token } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tenant', JSON.stringify(tenant));
    setState({ user, tenant, isAuthenticated: true, isLoading: false });
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    await refreshCsrf();
    const res = await apiFetch<{
      success: boolean;
      data: { user: User; tenant: Tenant; access_token: string; refresh_token: string };
    }>('/auth/register', {
      method: 'POST',
      body: data,
    });

    const { user, tenant, access_token, refresh_token } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tenant', JSON.stringify(tenant));
    setState({ user, tenant, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    setState({ user: null, tenant: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
