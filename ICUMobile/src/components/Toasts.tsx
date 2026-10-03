import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useICU, Toast } from '../data/mockICU';
import { useTokens } from '../theme/ThemeContext';
import { Icon, IconName } from './Icon';

export function Toasts() {
  const toasts = useICU(s => s.toasts);
  const t = useTokens();

  return (
    <View pointerEvents="none" style={styles.container}>
      {toasts.map(toast => {
        const colors = toneColors(toast.tone, t);
        const icon: IconName = toast.tone === 'ok' ? 'check_circle' : toast.tone === 'crit' || toast.tone === 'warn' ? 'alert' : 'bell';
        return (
          <View key={toast.id} style={[styles.toast, { backgroundColor: colors.bg, borderColor: colors.line }]}>
            <Icon name={icon} size={16} color={colors.fg} />
            <Text style={[styles.text, { color: colors.fg }]}>{toast.msg}</Text>
          </View>
        );
      })}
    </View>
  );
}

function toneColors(tone: Toast['tone'], t: ReturnType<typeof useTokens>) {
  switch (tone) {
    case 'ok': return { bg: t.okBg, fg: t.okFg, line: 'transparent' };
    case 'warn': return { bg: t.warnBg, fg: t.warnFg, line: 'transparent' };
    case 'crit': return { bg: t.critBg, fg: t.critFg, line: t.sigHr };
    default: return { bg: t.infoBg, fg: t.infoFg, line: 'transparent' };
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 340,
  },
  text: { fontSize: 13, fontWeight: '600' },
});
