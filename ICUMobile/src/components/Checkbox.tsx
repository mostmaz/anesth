import React, { ReactNode } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTokens } from '../theme/ThemeContext';
import { Icon } from './Icon';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}

export function Checkbox({ checked, onChange, children }: Props) {
  const t = useTokens();
  return (
    <Pressable onPress={() => onChange(!checked)} style={styles.row}>
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? t.accent : t.line2,
            backgroundColor: checked ? t.accent : t.surface,
          },
        ]}
      >
        {checked && <Icon name="check" size={14} color={t.accentFg} strokeWidth={3} />}
      </View>
      {children ? <Text style={[styles.label, { color: t.ink2 }]}>{children}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  label: { fontSize: 13 },
});
