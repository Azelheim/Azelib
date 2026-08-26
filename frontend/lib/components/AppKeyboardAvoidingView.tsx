import React from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useAzelheimTheme } from '../theme';

interface AppKeyboardAvoidingViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  extraBottomPadding?: number;
  scrollEnabled?: boolean;
}

/**
 * Universal Keyboard Avoiding View & ScrollView wrapper.
 * Ensures form inputs on all screens (Auth, Books, Loans, Members, Token, etc.)
 * are never obscured by the soft keyboard on iOS or Android.
 */
export function AppKeyboardAvoidingView({
  children,
  style,
  contentContainerStyle,
  extraBottomPadding = 80,
  scrollEnabled = true,
}: AppKeyboardAvoidingViewProps) {
  const { colors } = useAzelheimTheme();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      style={[styles.container, { backgroundColor: colors.bg }, style]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          contentContainerStyle,
          { paddingBottom: extraBottomPadding },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={true}
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});
