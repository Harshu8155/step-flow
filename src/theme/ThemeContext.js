// ThemeContext.js

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from './index';

const STORAGE_KEY = 'theme_mode_v1';
const DEFAULT_MODE = 'light';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);

        setMode(
          saved === 'dark' || saved === 'light'
            ? saved
            : DEFAULT_MODE
        );
      } catch (err) {
        console.warn('Failed to load theme preference:', err);
        setMode(DEFAULT_MODE);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const applyMode = useCallback((next) => {
    setMode(next);

    AsyncStorage.setItem(STORAGE_KEY, next).catch(err =>
      console.warn('Failed to persist theme preference:', err)
    );
  }, []);

  const toggleTheme = useCallback(() => {
    applyMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, applyMode]);

  const value = useMemo(() => ({
    mode,
    isDark: mode === 'dark',
    colors: themes[mode],
    setMode: applyMode,
    toggleTheme,
    ready,
  }), [mode, applyMode, toggleTheme, ready]);

  if (!ready || !mode) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return ctx;
}