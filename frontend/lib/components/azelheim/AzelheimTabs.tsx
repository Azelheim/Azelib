import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useAzelheimTheme } from '../../theme';

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface AzelheimTabsProps<T extends string = string> {
  tabs: TabOption<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function AzelheimTabs<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  style,
}: AzelheimTabsProps<T>) {
  const { colors } = useAzelheimTheme();

  return (
    <View
      style={[
        styles.tabsContainer,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        style,
      ]}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.value === activeTab;
        const isLast = idx === tabs.length - 1;

        return (
          <TouchableOpacity
            key={tab.value}
            activeOpacity={0.7}
            onPress={() => onTabChange(tab.value)}
            style={[
              styles.tabButton,
              {
                backgroundColor: isActive ? colors.purple : 'transparent',
                borderRightColor: colors.border,
                borderRightWidth: isLast ? 0 : 1.2,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabLabel,
                {
                  color: colors.text,
                  fontWeight: isActive ? '800' : '600',
                },
              ]}
            >
              {tab.label}
              {tab.count !== undefined ? ` [${tab.count}]` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    borderWidth: 1.2,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    minHeight: 38,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: 'monospace',
    fontSize: 10.5,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
