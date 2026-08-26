import React, { useRef } from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle, StyleProp, Animated } from 'react-native';
import { Sun, Moon, Settings2, Power } from 'lucide-react-native';
import { useAzelheimTheme } from '../../theme';
import { AzelheimIconButton } from './AzelheimIconButton';

interface AzelheimTopBarProps {
  title?: string;
  subtitle?: string;
  tag?: string;
  onThemeToggle?: () => void;
  onSettingsPress?: () => void;
  onLogoutPress?: () => void;
  rightActions?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AzelheimTopBar({
  title = 'Azelheim',
  subtitle = 'SYSTEM // CORE_LIB',
  tag = 'v2.4',
  onThemeToggle,
  onSettingsPress,
  onLogoutPress,
  rightActions,
  style,
}: AzelheimTopBarProps) {
  const { colors, isDark, toggleTheme } = useAzelheimTheme();
  const themeRotateAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  const handleToggle = () => {
    Animated.timing(themeRotateAnim, {
      toValue: isDark ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    if (onThemeToggle) {
      onThemeToggle();
    } else {
      toggleTheme();
    }
  };

  const spin = themeRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View
      style={[
        styles.topbar,
        {
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.brand}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {tag ? (
            <View
              style={[
                styles.tag,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text style={[styles.tagText, { color: colors.text }]}>{tag}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.faint }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {rightActions ? (
          rightActions
        ) : (
          <>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <AzelheimIconButton
                icon={
                  isDark ? (
                    <Moon size={19} color={colors.text} />
                  ) : (
                    <Sun size={19} color={colors.text} />
                  )
                }
                onPress={handleToggle}
                accessibilityLabel="Ganti Tema"
              />
            </Animated.View>
            {onSettingsPress && (
              <AzelheimIconButton
                icon={<Settings2 size={19} color={colors.text} />}
                onPress={onSettingsPress}
                accessibilityLabel="Pengaturan"
              />
            )}
            {onLogoutPress && (
              <AzelheimIconButton
                icon={<Power size={19} color={colors.danger} />}
                onPress={onLogoutPress}
                accessibilityLabel="Keluar"
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    height: 68,
    borderBottomWidth: 1.2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  brand: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontWeight: '800',
    fontSize: 16.5,
    letterSpacing: -0.4,
  },
  tag: {
    borderWidth: 1,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  tagText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 8.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
