import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { useTokens } from '../theme/ThemeContext';

interface FieldProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
}

export function Field({ label, containerStyle, style, ...rest }: FieldProps) {
  const t = useTokens();
  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.label, { color: t.ink3 }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={t.ink4}
        style={[
          styles.input,
          {
            color: t.ink,
            backgroundColor: t.surface2,
            borderColor: t.line,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    width: '100%',
  },
});
