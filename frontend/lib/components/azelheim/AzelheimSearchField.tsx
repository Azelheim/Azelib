import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { Search } from 'lucide-react-native';
import { useAzelheimTheme } from '../../theme';
import { AzelheimIconButton } from './AzelheimIconButton';

interface AzelheimSearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AzelheimSearchField({
  value,
  onChangeText,
  placeholder = 'Cari...',
  onSubmit,
  style,
}: AzelheimSearchFieldProps) {
  const { colors } = useAzelheimTheme();

  return (
    <View style={[styles.searchbar, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />
      <AzelheimIconButton
        icon={<Search size={18} color={colors.text} />}
        onPress={onSubmit}
        bordered
        size={40}
        accessibilityLabel="Cari"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1.2,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 5,
    minHeight: 40,
    maxHeight: 44,
    fontSize: 12.5,
    includeFontPadding: false,
  },
});
