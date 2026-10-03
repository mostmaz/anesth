interface Props {
  values: Array<number | null | undefined>;
  color?: string;
  height?: number;
  fill?: boolean;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function Sparkline({ values, color = 'var(--accent)', height = 30, fill = true }: Props) {
  // Filter to finite numbers ONLY — anything else corrupts SVG path data.
  const safe = (values || []).filter(isNum) as number[];
  if (safe.length < 2) return <div style={{ height }} />;

  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const w = 100, h = 100;
  const pts = safe.map((v, i) => {
    const x = (i / (safe.length - 1)) * w;
    const y = h - ((v - min) / range) * h * 0.8 - h * 0.1;
    return [x, y] as const;
  });
  const d = 'M' + pts.map((p) => p.join(',')).join(' L');
  const dFill = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      {fill && <path d={dFill} fill={color} opacity={0.12} />}
      <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
