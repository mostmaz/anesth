import { useEffect, useRef, useState } from 'react';

interface Props {
  color?: string;
  hr?: number;
  height?: number;
}

export function EkgTrace({ color = 'var(--sig-hr)', hr = 80, height = 60 }: Props) {
  const [t, setT] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const loop = () => {
      setT(performance.now() / 1000);
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  const w = 320, h = 70;
  const pulsePeriod = 60 / Math.max(40, hr);
  const points: [number, number][] = [];
  for (let i = 0; i <= w; i++) {
    const x = i;
    const localT = (i / w) * 4 + t * 0.6;
    const phase = (localT / pulsePeriod) % 1;
    let y = 0;
    if (phase < 0.05) y = -Math.sin((phase / 0.05) * Math.PI) * 3;
    else if (phase < 0.10) y = 0;
    else if (phase < 0.13) y = ((phase - 0.10) / 0.03) * 18;
    else if (phase < 0.16) y = 18 - ((phase - 0.13) / 0.03) * 38;
    else if (phase < 0.19) y = -20 + ((phase - 0.16) / 0.03) * 20;
    else if (phase < 0.35) y = -Math.sin(((phase - 0.19) / 0.16) * Math.PI) * 5;
    else y = 0;
    points.push([x, h / 2 - y]);
  }
  const d = 'M' + points.map((p) => p.join(',')).join(' L');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id="ekg-grad" x1="0%" x2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="85%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="url(#ekg-grad)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
