import React from 'react';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTokens } from '../theme/ThemeContext';

export type IconName =
  | 'heart' | 'activity' | 'droplet' | 'thermo' | 'wind'
  | 'bell' | 'bell_ring' | 'alert' | 'check' | 'check_circle' | 'x'
  | 'plus' | 'minus' | 'edit' | 'trash' | 'printer' | 'flask'
  | 'arrowUp' | 'arrowDown' | 'arrowLeft' | 'arrowRight'
  | 'user' | 'users' | 'pill' | 'syringe' | 'search' | 'filter'
  | 'camera' | 'dna' | 'monitor' | 'chevR' | 'chevL' | 'chevD' | 'chevU'
  | 'menu' | 'logout' | 'settings' | 'clock' | 'clipboard' | 'fileText'
  | 'notebook' | 'zap' | 'stetho' | 'shield' | 'body';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, color, strokeWidth = 2 }: IconProps) {
  const tokens = useTokens();
  const stroke = color || tokens.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths(name, stroke, strokeWidth)}
    </Svg>
  );
}

function p(d: string, stroke: string, sw: number) {
  return <Path d={d} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />;
}
function c(cx: number, cy: number, r: number, stroke: string, sw: number) {
  return <Circle cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
}
function r(x: number, y: number, w: number, h: number, rx: number | undefined, stroke: string, sw: number) {
  return <Rect x={x} y={y} width={w} height={h} rx={rx} stroke={stroke} strokeWidth={sw} fill="none" />;
}

function paths(name: IconName, s: string, sw: number) {
  switch (name) {
    case 'heart': return p('M20.42 4.58a5.4 5.4 0 0 0-7.65 0L12 5.34l-.77-.76a5.41 5.41 0 1 0-7.65 7.65l8.42 8.42 8.42-8.42a5.4 5.4 0 0 0 0-7.65z', s, sw);
    case 'activity': return p('M22 12h-4l-3 9L9 3l-3 9H2', s, sw);
    case 'droplet': return p('M12 2.69 5.64 9.05A8.5 8.5 0 0 0 12 21a8.5 8.5 0 0 0 6.36-11.95L12 2.69z', s, sw);
    case 'thermo': return p('M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z', s, sw);
    case 'wind': return <>{p('M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2', s, sw)}{p('M9.6 4.6A2 2 0 1 1 11 8H2', s, sw)}{p('M12.6 19.4A2 2 0 1 0 14 16H2', s, sw)}</>;
    case 'bell': return <>{p('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', s, sw)}{p('M10.3 21a1.94 1.94 0 0 0 3.4 0', s, sw)}</>;
    case 'bell_ring': return <>{p('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', s, sw)}{p('M10.3 21a1.94 1.94 0 0 0 3.4 0', s, sw)}{p('M4 2C2.8 3.7 2 5.7 2 8', s, sw)}{p('M22 8c0-2.3-.8-4.3-2-6', s, sw)}</>;
    case 'alert': return <>{p('M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', s, sw)}{p('M12 9v4', s, sw)}{p('M12 17h.01', s, sw)}</>;
    case 'check': return p('M20 6 9 17l-5-5', s, sw);
    case 'check_circle': return <>{c(12, 12, 10, s, sw)}{p('m9 12 2 2 4-4', s, sw)}</>;
    case 'x': return <>{p('M18 6 6 18', s, sw)}{p('m6 6 12 12', s, sw)}</>;
    case 'plus': return <>{p('M12 5v14', s, sw)}{p('M5 12h14', s, sw)}</>;
    case 'minus': return p('M5 12h14', s, sw);
    case 'edit': return <>{p('M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', s, sw)}{p('M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z', s, sw)}</>;
    case 'trash': return <>{p('M3 6h18', s, sw)}{p('M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', s, sw)}{p('M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', s, sw)}</>;
    case 'printer': return <>{p('M6 9V2h12v7', s, sw)}{p('M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2', s, sw)}{p('M6 14h12v8H6z', s, sw)}</>;
    case 'flask': return <>{p('M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2', s, sw)}{p('M8.5 2h7', s, sw)}{p('M7 16h10', s, sw)}</>;
    case 'arrowUp': return <>{p('M12 19V5', s, sw)}{p('m5 12 7-7 7 7', s, sw)}</>;
    case 'arrowDown': return <>{p('M12 5v14', s, sw)}{p('m19 12-7 7-7-7', s, sw)}</>;
    case 'arrowLeft': return <>{p('M19 12H5', s, sw)}{p('m12 19-7-7 7-7', s, sw)}</>;
    case 'arrowRight': return <>{p('M5 12h14', s, sw)}{p('m12 5 7 7-7 7', s, sw)}</>;
    case 'user': return <>{p('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', s, sw)}{c(12, 7, 4, s, sw)}</>;
    case 'users': return <>{p('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', s, sw)}{c(9, 7, 4, s, sw)}{p('M22 21v-2a4 4 0 0 0-3-3.87', s, sw)}{p('M16 3.13a4 4 0 0 1 0 7.75', s, sw)}</>;
    case 'pill': return <>{p('m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z', s, sw)}{p('m8.5 8.5 7 7', s, sw)}</>;
    case 'syringe': return <>{p('m18 2 4 4', s, sw)}{p('m17 7 3-3', s, sw)}{p('M19 9 8.7 19.3c-.3.3-.7.5-1.1.6L4 21l1-3.6c.1-.4.3-.8.6-1.1L15 6Z', s, sw)}{p('m9 11 4 4', s, sw)}{p('m13 7 4 4', s, sw)}</>;
    case 'search': return <>{c(11, 11, 8, s, sw)}{p('m21 21-4.3-4.3', s, sw)}</>;
    case 'filter': return p('M22 3H2l8 9.46V19l4 2v-8.54L22 3z', s, sw);
    case 'camera': return <>{p('M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z', s, sw)}{c(12, 13, 4, s, sw)}</>;
    case 'dna': return <>{p('M2 15c6.667-6 13.333 0 20-6', s, sw)}{p('M9 22c1.798-1.998 2.518-3.995 2.807-5.993', s, sw)}{p('M15 2c-1.798 1.998-2.518 3.995-2.807 5.993', s, sw)}{p('m17 6-2.5-2.5', s, sw)}{p('m14 8-1-1', s, sw)}{p('m7 18 2.5 2.5', s, sw)}{p('m3.5 14.5.5.5', s, sw)}{p('m20 9 .5.5', s, sw)}{p('m6.5 12.5 1 1', s, sw)}{p('m16.5 10.5 1 1', s, sw)}{p('m10 16 1.5 1.5', s, sw)}</>;
    case 'monitor': return <>{r(2, 3, 20, 14, 2, s, sw)}{p('M8 21h8', s, sw)}{p('M12 17v4', s, sw)}</>;
    case 'chevR': return p('m9 18 6-6-6-6', s, sw);
    case 'chevL': return p('m15 18-6-6 6-6', s, sw);
    case 'chevD': return p('m6 9 6 6 6-6', s, sw);
    case 'chevU': return p('m18 15-6-6-6 6', s, sw);
    case 'menu': return <>{p('M3 12h18', s, sw)}{p('M3 6h18', s, sw)}{p('M3 18h18', s, sw)}</>;
    case 'logout': return <>{p('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', s, sw)}{p('m16 17 5-5-5-5', s, sw)}{p('M21 12H9', s, sw)}</>;
    case 'settings': return <>{p('M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', s, sw)}{c(12, 12, 3, s, sw)}</>;
    case 'clock': return <>{c(12, 12, 10, s, sw)}{p('M12 6v6l4 2', s, sw)}</>;
    case 'clipboard': return <>{r(8, 2, 8, 4, 1, s, sw)}{p('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', s, sw)}</>;
    case 'fileText': return <>{p('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', s, sw)}{p('M14 2v6h6', s, sw)}{p('M16 13H8', s, sw)}{p('M16 17H8', s, sw)}{p('M10 9H8', s, sw)}</>;
    case 'notebook': return <>{p('M2 6h4', s, sw)}{p('M2 10h4', s, sw)}{p('M2 14h4', s, sw)}{p('M2 18h4', s, sw)}{r(4, 2, 16, 20, 2, s, sw)}</>;
    case 'zap': return p('M13 2 3 14h9l-1 8 10-12h-9l1-8z', s, sw);
    case 'stetho': return <>{p('M11 2v2', s, sw)}{p('M5 2v2', s, sw)}{p('M5 3h6', s, sw)}{p('M8 15a6 6 0 0 0 6-6V4', s, sw)}{p('M8 15a6 6 0 0 1-6-6V4', s, sw)}{c(20, 10, 2, s, sw)}{p('M20 12v3a4 4 0 0 1-4 4H9', s, sw)}</>;
    case 'shield': return p('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', s, sw);
    case 'body': return <>{c(12, 4, 2, s, sw)}{p('M12 6v8', s, sw)}{p('M8 14h8', s, sw)}{p('M8 14 6 22', s, sw)}{p('m16 14 2 8', s, sw)}{p('M12 14v8', s, sw)}{p('M9 9H6', s, sw)}{p('M15 9h3', s, sw)}</>;
    default: return null;
  }
}
