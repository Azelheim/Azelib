import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useAzelheimTheme } from '../../theme';

interface AzelheimInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  mono?: boolean;
  rightElement?: React.ReactNode;
}

export function AzelheimInput({
  label,
  error,
  containerStyle,
  mono = false,
  rightElement,
  style,
  multiline = false,
  numberOfLines,
  ...props
}: AzelheimInputProps) {
  const { colors } = useAzelheimTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.field, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={colors.faint}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: error ? colors.danger : isFocused ? colors.text : colors.border,
              borderWidth: isFocused ? 1.4 : 1.2,
              color: colors.text,
              fontFamily: mono
                ? Platform.OS === 'ios'
                  ? 'Courier'
                  : 'monospace'
                : undefined,
              minHeight: multiline ? 78 : 40,
              maxHeight: multiline ? 160 : 44,
              textAlignVertical: multiline ? 'top' : 'center',
              paddingVertical: multiline ? 8 : Platform.OS === 'ios' ? 8 : 4,
              paddingRight: rightElement ? 40 : 12,
            },
            style,
          ]}
          {...props}
        />
        {rightElement && (
          <View style={styles.rightElementWrap}>{rightElement}</View>
        )}
      </View>
      {!!error && (
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 10,
  },
  label: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    borderRadius: 4,
    paddingHorizontal: 12,
    fontSize: 12.5,
    includeFontPadding: false,
  },
  rightElementWrap: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '700',
  },
});
