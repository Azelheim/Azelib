import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { useAzelheimTheme } from '../../theme';

export type AzelheimBadgeVariant = 'green' | 'blue' | 'red' | 'amber' | 'gray' | 'purple';

interface AzelheimBadgeProps {
  children?: ReactNode;
  label?: string;
  variant?: AzelheimBadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export function AzelheimBadge({
  children,
  label,
  variant = 'gray',
  style,
}: AzelheimBadgeProps) {
  const { colors } = useAzelheimTheme();

  let bg = colors.surface;
  let textCol = colors.text;
  let borderCol = colors.border;

  if (variant === 'green') {
    bg = colors.green;
    textCol = colors.text;
  } else if (variant === 'blue') {
    bg = colors.blue;
    textCol = colors.text;
  } else if (variant === 'red') {
    bg = colors.red;
    textCol = colors.danger;
    borderCol = colors.danger;
  } else if (variant === 'amber') {
    bg = colors.amber;
    textCol = colors.text;
  } else if (variant === 'purple') {
    bg = colors.purple;
    textCol = colors.text;
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: borderCol,
        },
        style,
      ]}
    >
      {label ? (
        <Text style={[styles.text, { color: textCol }]}>{label.toUpperCase()}</Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.2,
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    minHeight: 26,
  },
  text: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    fontSize: 9.5,
    letterSpacing: 0.3,
  },
});
