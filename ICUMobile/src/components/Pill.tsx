import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTokens } from '../theme/ThemeContext';

export type PillTone = 'ok' | 'warn' | 'crit' | 'info' | 'muted' | 'accent';

interface PillProps {
  tone?: PillTone;
  children: ReactNode;
  style?: ViewStyle;
}

export function Pill({ tone = 'muted', children, style }: PillProps) {
  const t = useTokens();
  const colors = {
    ok: { bg: t.okBg, fg: t.okFg },
    warn: { bg: t.warnBg, fg: t.warnFg },
    crit: { bg: t.critBg, fg: t.critFg },
    info: { bg: t.infoBg, fg: t.infoFg },
    muted: { bg: t.surface3, fg: t.ink3 },
    accent: { bg: t.accentSoft, fg: t.accentInk },
  }[tone];

  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
