import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  ViewStyle,
  StyleProp,
  KeyboardAvoidingView,
} from 'react-native';
import { useAzelheimTheme } from '../../theme';

interface AzelheimScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  extraBottomPadding?: number;
  keyboardAvoiding?: boolean;
}

export function AzelheimScreen({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
  extraBottomPadding = 84,
  keyboardAvoiding = true,
}: AzelheimScreenProps) {
  const { colors } = useAzelheimTheme();

  const content = scrollable ? (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={[
        styles.scrollContent,
        contentContainerStyle,
        { paddingBottom: extraBottomPadding },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={true}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.fixedContent,
        contentContainerStyle,
        { paddingBottom: extraBottomPadding },
        style,
      ]}
    >
      {children}
    </View>
  );

  const inner = keyboardAvoiding ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
      style={{ flex: 1 }}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexGrow: 1,
  },
  fixedContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
