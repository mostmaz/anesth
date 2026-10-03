import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AvatarProps {
  initials: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ initials, color = '#64748b', size = 'md' }: AvatarProps) {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 56 : 38;
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 18 : 13;
  const radius = size === 'sm' ? 9 : size === 'lg' ? 16 : 12;
  return (
    <View style={[styles.av, { width: dim, height: dim, borderRadius: radius, backgroundColor: color }]}>
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  av: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  text: {
    color: 'white',
    fontWeight: '700',
  },
});
