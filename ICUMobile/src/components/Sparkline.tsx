import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  values: Array<number | null | undefined>;
  color: string;
  height?: number;
  fill?: boolean;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function Sparkline({ values, color, height = 30, fill = true }: Props) {
  // Filter to finite numbers ONLY — anything else corrupts SVG path data
  // and triggers the native parser to throw 'invalid number formatting character N'.
  const safe = (values || []).filter(isNum) as number[];
  if (safe.length < 2) return <View style={{ height }} />;

  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const w = 100, h = 100;
  const pts = safe.map((v, i) => {
    const x = (i / (safe.length - 1)) * w;
    const y = h - ((v - min) / range) * h * 0.8 - h * 0.1;
    return `${x},${y}`;
  });
  const d = 'M' + pts.join(' L');
  const dFill = d + ` L${w},${h} L0,${h} Z`;
  return (
    <Svg viewBox={`0 0 ${w} ${h}`} width="100%" height={height} preserveAspectRatio="none">
      {fill && <Path d={dFill} fill={color} opacity={0.12} />}
      <Path d={d} fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
}
