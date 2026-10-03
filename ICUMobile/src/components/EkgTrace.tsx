import React, { useEffect, useRef, useState } from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  color?: string;
  hr?: number;
  height?: number;
}

export function EkgTrace({ color = '#ef4444', hr = 80, height = 60 }: Props) {
  const [t, setT] = useState(0);
  const ref = useRef<any>(null);

  useEffect(() => {
    const handle = setInterval(() => {
      setT(prev => prev + 0.05); // 50ms tick
    }, 50);
    return () => clearInterval(handle);
  }, []);

  const w = 320, h = 70;
  const pulsePeriod = 60 / Math.max(40, hr);
  const points: string[] = [];
  for (let i = 0; i <= w; i += 2) {
    const x = i;
    const localT = (i / w) * 4 + t * 0.6;
    const phase = (localT / pulsePeriod) % 1;
    let y = 0;
    if (phase < 0.05)      y = -Math.sin(phase / 0.05 * Math.PI) * 3;
    else if (phase < 0.10) y = 0;
    else if (phase < 0.13) y = (phase - 0.10) / 0.03 * 18;
    else if (phase < 0.16) y = 18 - (phase - 0.13) / 0.03 * 38;
    else if (phase < 0.19) y = -20 + (phase - 0.16) / 0.03 * 20;
    else if (phase < 0.35) y = -Math.sin((phase - 0.19) / 0.16 * Math.PI) * 5;
    else                   y = 0;
    points.push(`${x},${h / 2 - y}`);
  }
  const d = 'M' + points.join(' L');
  return (
    <Svg viewBox={`0 0 ${w} ${h}`} width="100%" height={height}>
      <Defs>
        <LinearGradient id="ekgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <Stop offset="85%" stopColor={color} stopOpacity={1} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.1} />
        </LinearGradient>
      </Defs>
      <Path d={d} fill="none" stroke="url(#ekgGrad)" strokeWidth={1.8} />
    </Svg>
  );
}
