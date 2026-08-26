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
          borderColor: isAlert ? colors.danger : colors.border,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        {code ? (
          <Text
            style={[
              styles.code,
              { color: isAlert ? colors.danger : colors.faint },
            ]}
          >
            {code}
          </Text>
        ) : <View style={{ height: 12 }} />}
      </View>

      <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>
        {label}
      </Text>

      {customContent ? (
        <View style={styles.contentWrap}>{customContent}</View>
      ) : (
        <Text
          style={[
            styles.value,
            { color: isAlert ? colors.danger : colors.text },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      )}

      {sublabel ? (
        <Text
          style={[
            styles.sublabel,
            { color: isAlert ? colors.danger : colors.faint },
          ]}
          numberOfLines={1}
        >
          {sublabel}
        </Text>
      ) : (
        <View style={{ height: 13 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    borderWidth: 1.2,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 96,
    maxHeight: 108,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 12,
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 10.5,
    marginTop: 1,
    fontWeight: '600',
  },
  contentWrap: {
    marginVertical: 2,
  },
  value: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginVertical: 1,
  },
  sublabel: {
    fontSize: 9.5,
    marginTop: 1,
  },
});
