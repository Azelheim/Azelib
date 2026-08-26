import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { useAzelheimTheme } from '../../theme';

interface AzelheimCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  showCornerCross?: boolean;
  activeOpacity?: number;
}

export function AzelheimCard({
  children,
  style,
  onPress,
  showCornerCross = true,
  activeOpacity = 0.85,
}: AzelheimCardProps) {
  const { colors } = useAzelheimTheme();

  const cardContent = (
    <>
      {showCornerCross && (
        <Text style={[styles.cornerCross, { color: colors.faint }]} pointerEvents="none">
          +
        </Text>
      )}
      {children}
    </>
  );

  const containerStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1.2,
    borderRadius: 4,
    padding: 12,
    position: 'relative',
    marginBottom: 10,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        style={[containerStyle, style]}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return <View style={[containerStyle, style]}>{cardContent}</View>;
}

const styles = StyleSheet.create({
  cornerCross: {
    position: 'absolute',
    top: 4,
    right: 6,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    zIndex: 1,
  },
});
