import React from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { useAzelheimTheme } from '../../theme';

interface AzelheimCodeBoxProps {
  title?: string;
  code: string;
  caption?: string;
  style?: StyleProp<ViewStyle>;
  blurred?: boolean;
}

export function AzelheimCodeBox({
  title = 'TOKEN PERPUSTAKAAN',
  code,
  caption = 'CASE-INSENSITIVE · 6 CHAR',
  style,
  blurred = false,
}: AzelheimCodeBoxProps) {
  const { colors } = useAzelheimTheme();

  return (
    <View
      style={[
        styles.codeBox,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {title ? (
        <Text style={[styles.title, { color: colors.faint }]}>{title}</Text>
      ) : null}
      <Text
        style={[
          styles.code,
          {
            color: blurred ? colors.faint : colors.text,
            letterSpacing: 4,
          },
        ]}
      >
        {blurred ? '••••••' : code}
      </Text>
      {caption ? (
        <Text style={[styles.caption, { color: colors.faint }]}>{caption}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  codeBox: {
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderRadius: 4,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 26,
    fontWeight: '800',
    marginVertical: 4,
    textAlign: 'center',
  },
  caption: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
});
