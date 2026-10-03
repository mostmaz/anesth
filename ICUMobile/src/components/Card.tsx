import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useTokens } from '../theme/ThemeContext';
import { Icon, IconName } from './Icon';

interface CardProps {
  children: ReactNode;
  tight?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, tight = false, style, onPress }: CardProps) {
  const t = useTokens();
  const cardStyle = {
    backgroundColor: t.surface,
    borderColor: t.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: tight ? t.padRow : t.padCard,
    shadowColor: '#0f172a',
    shadowOpacity: t.shadowOpacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [cardStyle, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[cardStyle, style]}>{children}</View>;
}

interface CardHeadProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: 'ok' | 'warn' | 'crit' | 'info' | 'muted';
  right?: ReactNode;
}

export function CardHead({ title, subtitle, icon, iconTone = 'info', right }: CardHeadProps) {
  const t = useTokens();
  const iconColors = {
    ok: { bg: t.okBg, fg: t.okFg },
    warn: { bg: t.warnBg, fg: t.warnFg },
    crit: { bg: t.critBg, fg: t.critFg },
    info: { bg: t.infoBg, fg: t.infoFg },
    muted: { bg: t.surface3, fg: t.ink3 },
  }[iconTone];
  return (
    <View style={styles.head}>
      <View style={styles.headLeft}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: iconColors.bg }]}>
            <Icon name={icon} size={16} color={iconColors.fg} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, { color: t.ink }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: t.ink3 }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      {right ? <View style={{ flexShrink: 0 }}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  headLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  subtitle: { fontSize: 11, marginTop: 2 },
});
