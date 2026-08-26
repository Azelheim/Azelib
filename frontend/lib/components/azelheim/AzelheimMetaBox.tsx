import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { useAzelheimTheme } from '../../theme';

interface AzelheimMetaBoxProps {
  leftText?: string;
  rightText?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AzelheimMetaBox({
  leftText,
  rightText,
  children,
  style,
}: AzelheimMetaBoxProps) {
  const { colors } = useAzelheimTheme();

  return (
    <View
      style={[
        styles.metaBox,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
        },
        style,
      ]}
    >
      {children ? (
        children
      ) : (
        <>
          {leftText ? (
            <Text style={[styles.monoText, { color: colors.muted }]}>
              {leftText}
            </Text>
          ) : null}
          {rightText ? (
            <Text
              style={[
                styles.monoText,
                { color: colors.text, fontWeight: '700' },
              ]}
            >
              {rightText}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  metaBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 3,
    paddingVertical: 7,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9.5,
  },
});
