// Authentication state: current user + tokens, persisted across launches.
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';

const STORAGE_KEY = 'auth_v1';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null); // { accessToken, refreshToken }
  const [initializing, setInitializing] = useState(true);

  // Restore a saved session on cold start.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setUser(saved.user ?? null);
          setTokens(saved.tokens ?? null);
        }
      } catch (err) {
        console.warn('Failed to restore auth session:', err);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const persist = useCallback(async (nextUser, nextTokens) => {
    setUser(nextUser);
    setTokens(nextTokens);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, tokens: nextTokens }));
  }, []);

  const clear = useCallback(async () => {
    setUser(null);
    setTokens(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const register = useCallback(async (name, email, password) => {
    // Register no longer logs in — the emailed magic link (exchangeToken) starts the session.
    await authApi.register(name, email, password);
  }, []);

  // Called by the Verify screen after the app opens from the email link.
  const exchangeToken = useCallback(async (token) => {
    const data = await authApi.exchange(token);
    await persist(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
  }, [persist]);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    await persist(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
  }, [persist]);

  const logout = useCallback(async () => {
    // Best-effort server-side revoke; clear locally regardless of the result.
    try {
      if (tokens?.refreshToken) {
        await authApi.logout(tokens.refreshToken, tokens.accessToken);
      }
    } catch (err) {
      // token already expired / server unreachable — logging out locally is enough
    }
    await clear();
  }, [tokens, clear]);

  const value = useMemo(() => ({
    user,
    tokens,
    initializing,
    isAuthenticated: !!tokens?.accessToken,
    register,
    exchangeToken,
    login,
    logout,
  }), [user, tokens, initializing, register, exchangeToken, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
