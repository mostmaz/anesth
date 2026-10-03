import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
export type Shift = 'day' | 'night';
export type Accent = 'blue' | 'teal' | 'violet' | 'amber';
export type Density = 'comfy' | 'compact';

interface ThemeState {
  mode: ThemeMode;
  shift: Shift;
  accent: Accent;
  density: Density;
  setMode: (m: ThemeMode) => void;
  setShift: (s: Shift) => void;
  setAccent: (a: Accent) => void;
  setDensity: (d: Density) => void;
}

const Ctx = createContext<ThemeState | null>(null);

const STORAGE_KEY = 'icu-theme-prefs';

function load(): Partial<Pick<ThemeState, 'mode' | 'shift' | 'accent' | 'density'>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = load();
  const [mode, setMode] = useState<ThemeMode>(initial.mode || 'light');
  const [shift, setShift] = useState<Shift>(initial.shift || 'day');
  const [accent, setAccent] = useState<Accent>(initial.accent || 'blue');
  const [density, setDensity] = useState<Density>(initial.density || 'comfy');

  // Reflect to <html> data-* attrs so CSS variables apply
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = mode;
    r.dataset.shift = shift;
    r.dataset.accent = accent;
    r.dataset.density = density;
    // Sync Tailwind's `.dark` class for shadcn components / dark: utilities
    r.classList.toggle('dark', mode === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, shift, accent, density }));
    } catch {
      /* ignore */
    }
  }, [mode, shift, accent, density]);

  const value = useMemo<ThemeState>(
    () => ({ mode, shift, accent, density, setMode, setShift, setAccent, setDensity }),
    [mode, shift, accent, density],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside ThemeProvider');
  return v;
}
