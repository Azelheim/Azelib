import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { useAzelheimTheme } from '../../theme';

interface AzelheimStatCardProps {
  code?: string;
  label: string;
  value: string | number;
  sublabel?: string;
  isAlert?: boolean;
  style?: StyleProp<ViewStyle>;
  customContent?: ReactNode;
}

export function AzelheimStatCard({
  code,
  label,
  value,
  sublabel,
  isAlert = false,
  style,
  customContent,
}: AzelheimStatCardProps) {
  const { colors } = useAzelheimTheme();

  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {code ? (
        <Text
          style={[
            styles.code,
            { color: isAlert ? colors.danger : colors.faint },
          ]}
        >
          {code}
        </Text>
      ) : null}
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      {customContent ? (
        customContent
      ) : (
        <Text
          style={[
            styles.value,
            { color: isAlert ? colors.danger : colors.text },
          ]}
        >
          {value}
        </Text>
      )}
      {sublabel ? (
        <Text style={[styles.sublabel, { color: isAlert ? colors.danger : colors.faint }]}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    borderWidth: 1.2,
    borderRadius: 4,
    padding: 10,
    minHeight: 85,
    justifyContent: 'space-between',
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    fontWeight: '700',
  },
  label: {
    fontSize: 10.5,
    marginTop: 2,
    fontWeight: '600',
  },
  value: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 4,
  },
  sublabel: {
    fontSize: 9.5,
    marginTop: 2,
  },
});
