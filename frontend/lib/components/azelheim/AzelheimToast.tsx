import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { Info } from 'lucide-react-native';
import { useAzelheimTheme } from '../../theme';

interface AzelheimToastProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  duration?: number;
  bottomOffset?: number;
}

export function AzelheimToast({
  visible,
  message,
  onDismiss,
  duration = 3000,
  bottomOffset = 68,
}: AzelheimToastProps) {
  const { colors } = useAzelheimTheme();

  return (
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={duration}
      style={[
        styles.toast,
        {
          backgroundColor: colors.text,
          borderColor: colors.border,
          bottom: bottomOffset,
        },
      ]}
    >
      <View style={styles.toastContent}>
        <Info size={16} color={colors.bg} />
        <Text style={[styles.text, { color: colors.bg }]}>{message}</Text>
      </View>
    </Snackbar>
  );
}

const styles = StyleSheet.create({
  toast: {
    borderWidth: 1,
    borderRadius: 4,
    marginHorizontal: 16,
    paddingVertical: 2,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
});
