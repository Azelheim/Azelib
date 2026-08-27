import React, { ReactNode, useMemo } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Animated,
} from 'react-native';
import { useAzelheimTheme } from '../../theme';

interface AzelheimIconButtonProps {
  icon: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  size?: number;
  bordered?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function AzelheimIconButton({
  icon,
  onPress,
  style,
  size = 40,
  bordered = false,
  disabled = false,
  accessibilityLabel,
}: AzelheimIconButtonProps) {
  const { colors } = useAzelheimTheme();
  const scaleAnim = useMemo(() => new Animated.Value(1), []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
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

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.wrapper]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[
          styles.iconButton,
          {
            width: size,
            height: size,
            borderColor: bordered ? colors.border : 'transparent',
            borderWidth: bordered ? 1.2 : 0,
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ]}
      >
        {icon}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
