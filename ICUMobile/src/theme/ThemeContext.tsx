import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { buildTokens, Accent, Density, Shift, ThemeMode, Tokens } from './tokens';

interface ThemeState {
  mode: ThemeMode;
  shift: Shift;
  accent: Accent;
  density: Density;
  tokens: Tokens;
  setMode: (m: ThemeMode) => void;
  setShift: (s: Shift) => void;
  setAccent: (a: Accent) => void;
  setDensity: (d: Density) => void;
}

const Ctx = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [shift, setShift] = useState<Shift>('day');
  const [accent, setAccent] = useState<Accent>('blue');
  const [density, setDensity] = useState<Density>('comfy');

  const tokens = useMemo(() => buildTokens(mode, shift, accent, density), [mode, shift, accent, density]);

  const value = useMemo(
    () => ({ mode, shift, accent, density, tokens, setMode, setShift, setAccent, setDensity }),
    [mode, shift, accent, density, tokens],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside ThemeProvider');
  return v;
}

export function useTokens(): Tokens {
  return useTheme().tokens;
}
