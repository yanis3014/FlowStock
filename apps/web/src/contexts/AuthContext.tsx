'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'bmad_jwt_token';

export interface User {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  const loadStoredToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  }, []);

  const setToken = useCallback((token: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      if (token) {
        sessionStorage.setItem(STORAGE_KEY, token);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
    setState((prev) => ({ ...prev, token, user: token ? prev.user : null }));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setState((prev) => ({ ...prev, user: null }));
  }, [setToken]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      try {
        const csrfRes = await fetch(`${apiUrl}/csrf-token`, { credentials: 'include' });
        if (!csrfRes.ok) throw new Error('Impossible d\'obtenir le token CSRF');
        const csrfJson = await csrfRes.json();
        const csrfToken = (csrfJson?.csrfToken && String(csrfJson.csrfToken)) || '';

        const res = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          return { success: false, error: data?.error || 'Connexion impossible.' };
        }

        const accessToken = data?.data?.access_token;
        if (!accessToken) {
          return { success: false, error: 'Réponse inattendue.' };
        }

        setToken(accessToken);

        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur réseau.';
        return { success: false, error: msg };
      }
    },
    [setToken]
  );

  useEffect(() => {
    const token = loadStoredToken();
    if (!token) {
      setState((prev) => ({ ...prev, token: null, user: null, isLoading: false }));
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          setToken(null);
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.success && json?.data) {
          setState((prev) => ({
            ...prev,
            token,
            user: json.data,
            isLoading: false,
          }));
        } else {
          setState((prev) => ({ ...prev, token, user: null, isLoading: false }));
        }
      })
      .catch(() => {
        setToken(null);
        setState((prev) => ({ ...prev, isLoading: false }));
      });
  }, [loadStoredToken, setToken]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    setToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
