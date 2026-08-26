import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Portal, Modal } from 'react-native-paper';
import { useAzelheimTheme } from '../../theme';

interface AzelheimDialogProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  code?: string;
  subtitle?: string;
  children?: ReactNode;
}

export function AzelheimDialog({
  visible,
  onDismiss,
  title,
  code,
  subtitle,
  children,
}: AzelheimDialogProps) {
  const { colors } = useAzelheimTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalCard,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
          },
        ]}
      >
        {code ? (
          <Text style={[styles.code, { color: colors.faint }]}>{code}</Text>
        ) : null}
        {title ? (
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.content}>{children}</View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalCard: {
    margin: 20,
    borderWidth: 1.5,
    borderRadius: 6,
    padding: 16,
    maxHeight: '85%',
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11.5,
    marginBottom: 12,
    lineHeight: 16,
  },
  content: {
    marginTop: 4,
  },
});
