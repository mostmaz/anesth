import React from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Path, Ellipse, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTokens } from '../theme/ThemeContext';

type Side = 'FRONT' | 'BACK';

interface Region {
  id: string;
  cx: number;
  cy: number;
  r?: number;
  rx?: number;
  ry?: number;
}

interface Props {
  side: Side;
  assessedSet: Set<string>;
  onPick: (part: string) => void;
}

const FRONT: Region[] = [
  { id: 'Head', cx: 110, cy: 50, r: 22 },
  { id: 'Neck', cx: 110, cy: 80, r: 12 },
  { id: 'Chest', cx: 110, cy: 122, rx: 38, ry: 30 },
  { id: 'Abdomen', cx: 110, cy: 182, rx: 32, ry: 24 },
  { id: 'Left Arm', cx: 65, cy: 140, rx: 14, ry: 50 },
  { id: 'Right Arm', cx: 155, cy: 140, rx: 14, ry: 50 },
  { id: 'Left Leg', cx: 90, cy: 270, rx: 16, ry: 60 },
  { id: 'Right Leg', cx: 130, cy: 270, rx: 16, ry: 60 },
];

const BACK: Region[] = [
  { id: 'Head', cx: 110, cy: 50, r: 22 },
  { id: 'Neck', cx: 110, cy: 80, r: 12 },
  { id: 'Upper Back', cx: 110, cy: 122, rx: 38, ry: 30 },
  { id: 'Lower Back', cx: 110, cy: 168, rx: 32, ry: 18 },
  { id: 'Sacrum', cx: 110, cy: 200, rx: 26, ry: 16 },
  { id: 'Right Heel', cx: 92, cy: 330, rx: 12, ry: 10 },
  { id: 'Left Heel', cx: 128, cy: 330, rx: 12, ry: 10 },
  { id: 'Left Arm', cx: 65, cy: 140, rx: 14, ry: 50 },
  { id: 'Right Arm', cx: 155, cy: 140, rx: 14, ry: 50 },
  { id: 'Left Leg', cx: 90, cy: 270, rx: 16, ry: 50 },
  { id: 'Right Leg', cx: 130, cy: 270, rx: 16, ry: 50 },
];

export function BodyMap({ side, assessedSet, onPick }: Props) {
  const t = useTokens();
  const regions = side === 'FRONT' ? FRONT : BACK;

  return (
    <View style={{ width: 220, height: 360 }}>
      <Svg viewBox="0 0 220 360" width={220} height={360}>
        <Defs>
          <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={t.surface2} />
            <Stop offset="100%" stopColor={t.surface3} />
          </LinearGradient>
        </Defs>
        {/* silhouette */}
        <Ellipse cx={110} cy={50} rx={24} ry={28} fill="url(#bodyGrad)" stroke={t.line2} strokeWidth={1.5} />
        <Path
          d="M86 78 Q110 80 134 78 L150 100 Q160 130 156 168 L150 192 L70 192 L64 168 Q60 130 70 100 Z"
          fill="url(#bodyGrad)" stroke={t.line2} strokeWidth={1.5}
        />
        <Ellipse cx={65} cy={140} rx={14} ry={56} fill="url(#bodyGrad)" stroke={t.line2} strokeWidth={1.5} />
        <Ellipse cx={155} cy={140} rx={14} ry={56} fill="url(#bodyGrad)" stroke={t.line2} strokeWidth={1.5} />
        <Path
          d="M70 192 Q80 220 80 260 L75 340 L110 340 L110 250 L110 340 L145 340 L140 260 Q140 220 150 192 Z"
          fill="url(#bodyGrad)" stroke={t.line2} strokeWidth={1.5}
        />

        {/* region overlays */}
        {regions.map(reg => {
          const key = `${reg.id}|${side}`;
          const done = assessedSet.has(key);
          const fill = done ? `${t.accent}66` : 'transparent';
          const stroke = done ? t.accent : 'transparent';
          if (reg.r) {
            return (
              <Circle
                key={reg.id}
                cx={reg.cx}
                cy={reg.cy}
                r={reg.r}
                fill={fill}
                stroke={stroke}
                strokeWidth={2}
                onPress={() => onPick(reg.id)}
              />
            );
          }
          return (
            <Ellipse
              key={reg.id}
              cx={reg.cx}
              cy={reg.cy}
              rx={reg.rx}
              ry={reg.ry}
              fill={fill}
              stroke={stroke}
              strokeWidth={2}
              onPress={() => onPick(reg.id)}
            />
          );
        })}
      </Svg>
    </View>
  );
}
