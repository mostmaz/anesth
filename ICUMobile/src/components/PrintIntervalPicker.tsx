import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTokens } from '../theme/ThemeContext';
import { Field } from './Field';

// Time window for a printable report: a number of hours, or 'all' records.
export type PrintInterval = number | 'all';

const PRESETS: Array<{ label: string; value: PrintInterval }> = [
  { label: '6h', value: 6 },
  { label: '12h', value: 12 },
  { label: '24h', value: 24 },
  { label: '48h', value: 48 },
  { label: 'All', value: 'all' },
];

export function PrintIntervalPicker({
  value, onChange, customHours, onCustomChange,
}: {
  value: PrintInterval;
  onChange: (v: PrintInterval) => void;
  customHours: string;
  onCustomChange: (s: string) => void;
}) {
  const t = useTokens();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.6 }}>Time range</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PRESETS.map(p => {
          const on = !customHours && value === p.value;
          return (
            <Pressable
              key={String(p.value)}
              onPress={() => { onCustomChange(''); onChange(p.value); }}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                borderColor: on ? t.accent : t.line2,
                backgroundColor: on ? t.accentSoft : t.surface,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: on ? '700' : '500', color: on ? t.accentInk : t.ink2 }}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Field
        label="Custom (hours)"
        placeholder="e.g. 8"
        keyboardType="number-pad"
        value={customHours}
        onChangeText={(txt) => {
          const cleaned = txt.replace(/[^0-9]/g, '');
          onCustomChange(cleaned);
          const n = Number(cleaned);
          if (cleaned && Number.isFinite(n) && n > 0) onChange(n);
        }}
      />
    </View>
  );
}

// Keep only records whose timestamp falls within the chosen window.
export function filterByInterval<T extends { t: Date | string }>(items: T[], interval: PrintInterval): T[] {
  if (interval === 'all') return items;
  const cutoff = Date.now() - interval * 3600_000;
  return items.filter(i => new Date(i.t).getTime() >= cutoff);
}

export function intervalLabel(interval: PrintInterval): string {
  return interval === 'all' ? 'All records' : `Last ${interval} hour${interval === 1 ? '' : 's'}`;
}
