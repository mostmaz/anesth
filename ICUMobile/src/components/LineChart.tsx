import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Rect, Circle } from 'react-native-svg';
import { useTokens } from '../theme/ThemeContext';

interface Series {
  values: Array<number | null | undefined>;
  color: string;
  label?: string;
}

interface Props {
  series: Series[];
  height?: number;
  refRange?: [number, number];
  yLabel?: string;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function LineChart({ series, height = 160, refRange, yLabel }: Props) {
  const t = useTokens();

  // Sanitize series so NaN / null values never reach SVG path data
  // (native parser rejects "MNaN..." with "invalid number formatting character N").
  const sanitized = series.map(s => ({
    ...s,
    valid: s.values.map((v, i) => ({ i, v })).filter(p => isNum(p.v)) as Array<{ i: number; v: number }>,
  }));

  const allValid = sanitized.flatMap(s => s.valid.map(p => p.v));
  if (allValid.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: t.ink3, fontSize: 12 }}>No data</Text>
      </View>
    );
  }

  const min = Math.min(...allValid);
  const max = Math.max(...allValid);
  const refLo = refRange && Number.isFinite(refRange[0]) ? refRange[0] : undefined;
  const refHi = refRange && Number.isFinite(refRange[1]) ? refRange[1] : undefined;
  const yMin = refLo !== undefined ? Math.min(refLo, min) : min;
  const yMax = refHi !== undefined ? Math.max(refHi, max) : max;
  const pad = (yMax - yMin) * 0.12 || 1;
  const lo = yMin - pad, hi = yMax + pad;
  const range = hi - lo || 1;
  const w = 320, h = 120, px = 36, py = 14;
  const N = Math.max(1, ...series.map(s => s.values.length));
  const ny = 4;
  const ticks = Array.from({ length: ny }, (_, i) => lo + (i / (ny - 1)) * range);

  const xAt = (i: number) => px + (N <= 1 ? 0 : (i / (N - 1)) * (w - px - 4));
  const yAt = (v: number) => h - py - ((v - lo) / range) * (h - py - 6);

  return (
    <Svg viewBox={`0 0 ${w} ${h}`} width="100%" height={height}>
      {refRange && refLo !== undefined && refHi !== undefined && (
        <Rect
          x={px}
          y={yAt(refHi)}
          width={w - px - 4}
          height={Math.max(2, yAt(refLo) - yAt(refHi))}
          fill={t.accent}
          opacity={0.06}
        />
      )}
      {ticks.map((tv, i) => (
        <React.Fragment key={i}>
          <Line x1={px} x2={w - 4} y1={yAt(tv)} y2={yAt(tv)} stroke={t.line} strokeDasharray="2,4" />
          <SvgText x={px - 4} y={yAt(tv) + 3} textAnchor="end" fontSize={9} fill={t.ink3}>
            {Math.round(tv)}
          </SvgText>
        </React.Fragment>
      ))}
      {sanitized.map((s, si) => {
        if (s.valid.length === 0) return null;
        // Build path with only valid points
        const pts = s.valid.map(p => `${xAt(p.i)},${yAt(p.v)}`).join(' L');
        return (
          <React.Fragment key={si}>
            {s.valid.length >= 2 && (
              <Path d={`M${pts}`} fill="none" stroke={s.color} strokeWidth={2} />
            )}
            {s.valid.map(p => (
              <Circle key={p.i} cx={xAt(p.i)} cy={yAt(p.v)} r={2.4} fill={s.color} />
            ))}
          </React.Fragment>
        );
      })}
      {yLabel && (
        <SvgText x={px} y={py + 4} fontSize={9} fill={t.ink3}>
          {yLabel}
        </SvgText>
      )}
    </Svg>
  );
}
