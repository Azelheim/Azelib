import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { useAzelheimTheme } from '../../theme';

interface AzelheimSectionHeaderProps {
  title: string;
  code?: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  rightContent?: ReactNode;
}

export function AzelheimSectionHeader({
  title,
  code,
  icon,
  style,
  rightContent,
}: AzelheimSectionHeaderProps) {
  const { colors } = useAzelheimTheme();

  return (
    <View style={[styles.header, { borderBottomColor: colors.line }, style]}>
      <View style={styles.titleRow}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      {rightContent ? (
        rightContent
      ) : code ? (
        <Text style={[styles.code, { color: colors.faint }]}>{code}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    paddingBottom: 6,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9.5,
    fontWeight: '600',
  },
});
