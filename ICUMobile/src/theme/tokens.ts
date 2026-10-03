// Design tokens ported from design system styles.css

export type ThemeMode = 'light' | 'dark';
export type Shift = 'day' | 'night';
export type Accent = 'blue' | 'teal' | 'violet' | 'amber';
export type Density = 'comfy' | 'compact';

export interface Tokens {
  bg: string;
  bg2: string;
  surface: string;
  surface2: string;
  surface3: string;
  line: string;
  line2: string;
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;

  // status
  okBg: string; okFg: string; okLine: string;
  warnBg: string; warnFg: string; warnLine: string;
  critBg: string; critFg: string; critLine: string;
  infoBg: string; infoFg: string; infoLine: string;
  staleBg: string; staleFg: string;

  // monitor signals (theme-independent)
  sigHr: string;
  sigSpo: string;
  sigBp: string;
  sigTemp: string;
  sigRr: string;
  sigRbs: string;

  // accent
  accent: string;
  accentFg: string;
  accentSoft: string;
  accentInk: string;

  // density
  padCard: number;
  padRow: number;
  gapTile: number;

  // shadow opacity for elevation
  shadowOpacity: number;

  // tint overlay (for shift)
  tintColor: string;
  tintOpacity: number;
}

export const baseTokens = {
  sigHr: '#ef4444',
  sigSpo: '#06b6d4',
  sigBp: '#a855f7',
  sigTemp: '#f59e0b',
  sigRr: '#22c55e',
  sigRbs: '#fb7185',
};

const lightStatus = {
  okBg: '#dcfce7', okFg: '#14532d', okLine: '#22c55e',
  warnBg: '#fef3c7', warnFg: '#78350f', warnLine: '#f59e0b',
  critBg: '#fee2e2', critFg: '#7f1d1d', critLine: '#ef4444',
  infoBg: '#dbeafe', infoFg: '#1e3a8a', infoLine: '#2563eb',
  staleBg: '#fde2e4', staleFg: '#9b1c1c',
};

const darkStatus = {
  okBg: '#062e1d', okFg: '#6ee7a8', okLine: '#22c55e',
  warnBg: '#2b1c06', warnFg: '#fcd34d', warnLine: '#f59e0b',
  critBg: '#2a0a0a', critFg: '#fda4a4', critLine: '#ef4444',
  infoBg: '#0d1f3d', infoFg: '#93c5fd', infoLine: '#2563eb',
  staleBg: '#2a0a0a', staleFg: '#fda4a4',
};

const lightSurface = {
  bg: '#f7f9fc',
  bg2: '#eef2f7',
  surface: '#ffffff',
  surface2: '#f8fafc',
  surface3: '#f1f5f9',
  line: '#e2e8f0',
  line2: '#cbd5e1',
  ink: '#0f172a',
  ink2: '#334155',
  ink3: '#64748b',
  ink4: '#94a3b8',
  shadowOpacity: 0.08,
};

const darkSurface = {
  bg: '#07090d',
  bg2: '#0c1118',
  surface: '#11161f',
  surface2: '#161c27',
  surface3: '#1c2330',
  line: '#232b3a',
  line2: '#303a4d',
  ink: '#f1f5f9',
  ink2: '#cbd5e1',
  ink3: '#94a3b8',
  ink4: '#64748b',
  shadowOpacity: 0.4,
};

const accentLightMap: Record<Accent, { accent: string; accentFg: string; accentSoft: string; accentInk: string }> = {
  blue:   { accent: '#2563eb', accentFg: '#ffffff', accentSoft: '#dbeafe', accentInk: '#1e3a8a' },
  teal:   { accent: '#0d9488', accentFg: '#ffffff', accentSoft: '#ccfbf1', accentInk: '#134e4a' },
  violet: { accent: '#7c3aed', accentFg: '#ffffff', accentSoft: '#ede9fe', accentInk: '#4c1d95' },
  amber:  { accent: '#d97706', accentFg: '#ffffff', accentSoft: '#fef3c7', accentInk: '#78350f' },
};

const accentDarkMap: Record<Accent, { accent: string; accentFg: string; accentSoft: string; accentInk: string }> = {
  blue:   { accent: '#2563eb', accentFg: '#ffffff', accentSoft: '#0d1f3d', accentInk: '#93c5fd' },
  teal:   { accent: '#0d9488', accentFg: '#ffffff', accentSoft: '#03302c', accentInk: '#5eead4' },
  violet: { accent: '#7c3aed', accentFg: '#ffffff', accentSoft: '#1f1442', accentInk: '#c4b5fd' },
  amber:  { accent: '#d97706', accentFg: '#ffffff', accentSoft: '#2a1c05', accentInk: '#fcd34d' },
};

const densityMap: Record<Density, { padCard: number; padRow: number; gapTile: number }> = {
  comfy:   { padCard: 20, padRow: 14, gapTile: 14 },
  compact: { padCard: 12, padRow: 10, gapTile: 10 },
};

export function buildTokens(mode: ThemeMode, shift: Shift, accent: Accent, density: Density): Tokens {
  const surfaceTokens = mode === 'dark' ? darkSurface : lightSurface;
  const statusTokens = mode === 'dark' ? darkStatus : lightStatus;
  const accentTokens = mode === 'dark' ? accentDarkMap[accent] : accentLightMap[accent];
  const densityTokens = densityMap[density];

  let tintColor = '#000000';
  let tintOpacity = 0;
  if (shift === 'night') {
    tintColor = '#321e5a';
    tintOpacity = mode === 'dark' ? 0.10 : 0.04;
  } else {
    tintColor = '#ffb45a';
    tintOpacity = 0.04;
  }

  return {
    ...surfaceTokens,
    ...statusTokens,
    ...baseTokens,
    ...accentTokens,
    ...densityTokens,
    tintColor,
    tintOpacity,
  };
}

// Type scale (same regardless of theme)
export const type = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
  vital: 56,
  vitalLg: 72,
};

export const radii = { sm: 8, md: 12, lg: 16, xl: 22 };
