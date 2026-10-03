import React, { ReactNode } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { useTokens } from '../theme/ThemeContext';
import { Icon, IconName } from './Icon';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger' | 'success';
type Size = 'xs' | 'sm' | 'md' | 'icon-sm' | 'icon';

interface Props {
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  color?: string;            // override text color (for ghost with custom)
  fullWidth?: boolean;
}

export function Button({
  onPress, variant = 'primary', size = 'md', icon, iconRight,
  children, disabled, loading, style, textStyle, color, fullWidth,
}: Props) {
  const t = useTokens();

  const variantStyle = (() => {
    switch (variant) {
      case 'primary': return { bg: t.accent, fg: t.accentFg, border: t.accent };
      case 'ghost': return { bg: 'transparent', fg: color || t.ink2, border: 'transparent' };
      case 'outline': return { bg: t.surface, fg: t.ink, border: t.line2 };
      case 'danger': return { bg: '#ef4444', fg: 'white', border: '#ef4444' };
      case 'success': return { bg: '#16a34a', fg: 'white', border: '#16a34a' };
    }
  })();

  const sizeStyle = (() => {
    switch (size) {
      case 'xs': return { padH: 10, padV: 6, fontSize: 12, radius: 8, iconSize: 12 };
      case 'sm': return { padH: 12, padV: 8, fontSize: 13, radius: 10, iconSize: 14 };
      case 'md': return { padH: 16, padV: 12, fontSize: 14, radius: 12, iconSize: 16 };
      case 'icon-sm': return { padH: 0, padV: 0, fontSize: 0, radius: 8, iconSize: 16, dim: 32 };
      case 'icon': return { padH: 0, padV: 0, fontSize: 0, radius: 10, iconSize: 18, dim: 40 };
    }
  })();

  const isIconOnly = size === 'icon-sm' || size === 'icon';
  const dim = isIconOnly ? (sizeStyle as any).dim : undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: variantStyle.bg,
          borderColor: variantStyle.border,
          paddingHorizontal: sizeStyle.padH,
          paddingVertical: sizeStyle.padV,
          borderRadius: sizeStyle.radius,
          opacity: disabled ? 0.5 : pressed ? 0.86 : 1,
          width: fullWidth ? '100%' : (dim || undefined),
          height: dim || undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyle.fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={sizeStyle.iconSize} color={variantStyle.fg} />}
          {children ? (
            <Text style={[styles.text, { color: variantStyle.fg, fontSize: sizeStyle.fontSize }, textStyle]}>
              {children}
            </Text>
          ) : null}
          {iconRight && <Icon name={iconRight} size={sizeStyle.iconSize} color={variantStyle.fg} />}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  text: {
    fontWeight: '600',
  },
});
