import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTokens } from '../theme/ThemeContext';

interface Props {
  children: ReactNode;
  right?: ReactNode;
}

export function SectionTitle({ children, right }: Props) {
  const t = useTokens();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: t.ink3 }]}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
});
