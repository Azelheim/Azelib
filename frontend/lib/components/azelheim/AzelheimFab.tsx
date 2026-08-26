import React, { ReactNode, useRef } from 'react';
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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
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
        {icon || <Plus size={22} color={colors.bg} />}
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
    width: 50,
    height: 50,
    borderWidth: 1.5,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
});
