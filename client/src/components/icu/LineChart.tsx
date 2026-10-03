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

export function LineChart({ series, height = 180, refRange, yLabel }: Props) {
  // Sanitize values — any non-finite entry corrupts SVG path data
  // ("invalid number formatting character N" from path d="MNaN...").
  const sanitized = series.map((s) => ({
    ...s,
    valid: s.values.map((v, i) => ({ i, v })).filter((p) => isNum(p.v)) as Array<{ i: number; v: number }>,
  }));

  const allValid = sanitized.flatMap((s) => s.valid.map((p) => p.v));
  if (allValid.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
        No data
      </div>
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
  const N = Math.max(1, ...series.map((s) => s.values.length));
  const ny = 4;
  const ticks = Array.from({ length: ny }, (_, i) => lo + (i / (ny - 1)) * range);
  const x = (i: number) => px + (N <= 1 ? 0 : (i / (N - 1)) * (w - px - 4));
  const y = (v: number) => h - py - ((v - lo) / range) * (h - py - 6);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }}>
      {refRange && refLo !== undefined && refHi !== undefined && (
        <rect
          x={px}
          y={y(refHi)}
          width={w - px - 4}
          height={Math.max(2, y(refLo) - y(refHi))}
          fill="var(--accent)"
          opacity="0.06"
        />
      )}
      {ticks.map((tv, i) => (
        <g key={i}>
          <line x1={px} x2={w - 4} y1={y(tv)} y2={y(tv)} stroke="var(--line)" strokeDasharray="2 4" />
          <text x={px - 4} y={y(tv) + 3} textAnchor="end" fontSize="9" fill="var(--ink-3)" fontFamily="var(--font-mono)">
            {Math.round(tv)}
          </text>
        </g>
      ))}
      {sanitized.map((s, si) => {
        if (s.valid.length === 0) return null;
        const pts = s.valid.map((p) => `${x(p.i)},${y(p.v)}`).join(' L');
        return (
          <g key={si}>
            {s.valid.length >= 2 && (
              <path d={`M${pts}`} fill="none" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            )}
            {s.valid.map((p) => (
              <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r="2.4" fill={s.color} />
            ))}
          </g>
        );
      })}
      {yLabel && (
        <text x={px} y={py + 4} fontSize="9" fill="var(--ink-3)" fontFamily="var(--font-mono)">{yLabel}</text>
      )}
    </svg>
  );
}
