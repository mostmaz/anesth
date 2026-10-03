import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTokens } from '../theme/ThemeContext';
import { Icon, IconName } from './Icon';

type Sig = 'sigHr' | 'sigSpo' | 'sigBp' | 'sigTemp' | 'sigRr' | 'sigRbs';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  signal?: Sig;
  icon?: IconName;
  big?: boolean;
  sub?: string;
  blip?: boolean;
  stale?: boolean;
}

export function VitalTile({ label, value, unit, signal = 'sigHr', icon, big = false, sub, blip = false, stale = false }: Props) {
  const t = useTokens();
  const valStr = String(value);
  const shrink = valStr.length > 3;
  const sigColor = t[signal];

  const fontSize = big
    ? (shrink ? 38 : 56)
    : (shrink ? 22 : 28);

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: t.surface,
          borderColor: stale ? t.sigHr : t.line,
        },
      ]}
    >
      <View style={styles.headRow}>
        <View style={styles.headLeft}>
          {icon && <Icon name={icon} size={11} color={sigColor} />}
          <Text style={[styles.label, { color: t.ink3 }]}>{label}</Text>
        </View>
        {blip && <View style={[styles.dot, { backgroundColor: sigColor }]} />}
      </View>
      <View style={[styles.valueRow, { minHeight: big ? 48 : 32 }]}>
        <Text style={[styles.value, { color: sigColor, fontSize }]}>{value}</Text>
        {unit ? <Text style={[styles.unit, { color: t.ink3 }]}>{unit}</Text> : null}
      </View>
      {sub ? <Text style={[styles.sub, { color: t.ink3 }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 6,
  },
  value: {
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: undefined,
  },
  unit: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  sub: {
    fontSize: 11,
    marginTop: 4,
  },
});
