import React, { ReactNode, useMemo } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Animated,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { useAzelheimTheme } from '../../theme';

interface AzelheimFabProps {
  onPress: () => void;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function AzelheimFab({
  onPress,
  icon,
  style,
  accessibilityLabel = 'Tambah',
}: AzelheimFabProps) {
  const { colors } = useAzelheimTheme();
  const pressAnim = useMemo(() => new Animated.Value(0), []);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 35,
      bounciness: 4,
    }).start();
  };

  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.90],
  });

  const rotate = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        { transform: [{ scale }] },
        style,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.fab,
          {
            backgroundColor: colors.text,
            borderColor: colors.border,
          },
        ]}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          {icon || <Plus size={22} color={colors.bg} />}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    zIndex: 10,
  },
  fab: {
    width: 48,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
