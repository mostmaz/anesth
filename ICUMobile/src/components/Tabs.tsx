import React from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { useTokens } from '../theme/ThemeContext';

export interface TabItem {
  value: string;
  label: string;
  dot?: boolean;
}

interface TabsProps {
  value: string;
  onChange: (v: string) => void;
  items: TabItem[];
}

export function Tabs({ value, onChange, items }: TabsProps) {
  const t = useTokens();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((it) => {
        const active = value === it.value;
        return (
          <Pressable
            key={it.value}
            onPress={() => onChange(it.value)}
            style={[
              styles.btn,
              { backgroundColor: active ? t.accentSoft : 'transparent' },
            ]}
          >
            <Text style={[styles.label, { color: active ? t.accentInk : t.ink3 }]}>{it.label}</Text>
            {it.dot && <View style={[styles.dot, { backgroundColor: t.sigHr }]} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

interface RailProps {
  value: string;
  onChange: (v: string) => void;
  items: TabItem[];
}

// Pill-rail variant (segmented control style) used inside cards
export function TabRail({ value, onChange, items }: RailProps) {
  const t = useTokens();
  return (
    <View style={[styles.rail, { backgroundColor: t.surface3, borderColor: t.line }]}>
      {items.map((it) => {
        const active = value === it.value;
        return (
          <Pressable
            key={it.value}
            onPress={() => onChange(it.value)}
            style={[
              styles.railTab,
              { backgroundColor: active ? t.surface : 'transparent' },
            ]}
          >
            <Text style={[styles.railLabel, { color: active ? t.ink : t.ink3 }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 4, paddingHorizontal: 0 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  label: { fontSize: 13, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },
  rail: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  railTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  railLabel: { fontSize: 13, fontWeight: '600' },
});
