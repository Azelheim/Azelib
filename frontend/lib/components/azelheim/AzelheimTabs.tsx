import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp, Platform, Animated } from 'react-native';
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

function TabItem<T extends string = string>({
  tab,
  isActive,
  isLast,
  onPress,
}: {
  tab: TabOption<T>;
  isActive: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const { colors } = useAzelheimTheme();
  const pressAnim = useMemo(() => new Animated.Value(1), []);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.tabButton,
        {
          backgroundColor: isActive ? colors.purple : 'transparent',
          borderRightColor: colors.border,
          borderRightWidth: isLast ? 0 : 1.2,
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: pressAnim }], width: '100%', alignItems: 'center' }}>
        <Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color: colors.text,
              fontWeight: isActive ? '800' : '600',
              opacity: isActive ? 1 : 0.75,
            },
          ]}
        >
          {tab.label}
          {tab.count !== undefined ? ` [${tab.count}]` : ''}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
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
          <TabItem
            key={tab.value}
            tab={tab}
            isActive={isActive}
            isLast={isLast}
            onPress={() => onTabChange(tab.value)}
          />
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
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10.5,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
