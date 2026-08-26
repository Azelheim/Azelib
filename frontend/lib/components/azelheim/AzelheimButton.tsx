import React, { ReactNode, useRef } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
  Animated,
  Platform,
} from 'react-native';
import { useAzelheimTheme } from '../../theme';

export type AzelheimButtonVariant = 'dark' | 'light' | 'purple' | 'red' | 'ghost';

interface AzelheimButtonProps {
  children?: ReactNode;
  title?: string;
  variant?: AzelheimButtonVariant;
  onPress?: () => void;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
  size?: 'default' | 'small';
  accessibilityLabel?: string;
}

export function AzelheimButton({
  children,
  title,
  variant = 'dark',
  onPress,
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  size = 'default',
  accessibilityLabel,
}: AzelheimButtonProps) {
  const { colors } = useAzelheimTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 35,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 4,
    }).start();
  };

  let bg = colors.text;
  let textCol = colors.bg;
  let borderCol = colors.border;

  if (variant === 'light') {
    bg = colors.card;
    textCol = colors.text;
    borderCol = colors.border;
  } else if (variant === 'purple') {
    bg = colors.purple;
    textCol = colors.text;
    borderCol = colors.border;
  } else if (variant === 'red') {
    bg = colors.red;
    textCol = colors.danger;
    borderCol = colors.danger;
  } else if (variant === 'ghost') {
    bg = 'transparent';
    textCol = colors.text;
    borderCol = 'transparent';
  }

  const minHeight = size === 'small' ? 36 : 42;
  const fontSize = size === 'small' ? 10.5 : 11.5;
  const paddingV = size === 'small' ? 6 : 8;

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && { width: '100%' },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityLabel={accessibilityLabel || title}
        style={[
          styles.button,
          {
            backgroundColor: bg,
            borderColor: borderCol,
            minHeight: minHeight,
            paddingVertical: paddingV,
            opacity: disabled ? 0.45 : 1,
            width: fullWidth ? '100%' : undefined,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textCol} />
        ) : (
          <View style={styles.contentRow}>
            {icon && <View style={styles.iconWrap}>{icon}</View>}
            {title ? (
              <Text
                style={[
                  styles.label,
                  { color: textCol, fontSize: fontSize },
                  textStyle,
                ]}
              >
                {title}
              </Text>
            ) : (
              children
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.2,
    borderRadius: 4,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
