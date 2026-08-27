import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle, StyleProp, Animated } from 'react-native';
import { Sun, Moon, SlidersHorizontal, Power } from 'lucide-react-native';
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
  const themeAnim = useMemo(() => new Animated.Value(0), []);

  const handleToggle = () => {
    Animated.spring(themeAnim, {
      toValue: isDark ? 0 : 1,
      useNativeDriver: true,
      bounciness: 4,
      speed: 12,
    }).start();
    if (onThemeToggle) {
      onThemeToggle();
    } else {
      toggleTheme();
    }
  };

  const spin = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const scale = themeAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.82, 1],
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
      <View style={styles.inner}>
        <View style={styles.mainRow}>
          <View style={styles.brand}>
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

          <View style={styles.actions}>
            {rightActions ? (
              rightActions
            ) : (
              <>
                <Animated.View style={{ transform: [{ rotate: spin }, { scale }] }}>
                  <AzelheimIconButton
                    icon={
                      isDark ? (
                        <Moon size={20} color={colors.text} />
                      ) : (
                        <Sun size={20} color={colors.text} />
                      )
                    }
                    onPress={handleToggle}
                    accessibilityLabel="Ganti Tema"
                    size={42}
                  />
                </Animated.View>
                {onSettingsPress && (
                  <AzelheimIconButton
                    icon={<SlidersHorizontal size={20} color={colors.text} />}
                    onPress={onSettingsPress}
                    accessibilityLabel="Pengaturan"
                    size={42}
                  />
                )}
                {onLogoutPress && (
                  <AzelheimIconButton
                    icon={<Power size={20} color={colors.danger} />}
                    onPress={onLogoutPress}
                    accessibilityLabel="Keluar"
                    size={42}
                  />
                )}
              </>
            )}
          </View>
        </View>

        {subtitle ? (
          <View style={styles.metaRow}>
            <Text style={[styles.subtitle, { color: colors.faint }]}>
              {subtitle}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    borderBottomWidth: 1.2,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 11,
  },
  inner: {
    width: '100%',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: -0.4,
  },
  tag: {
    borderWidth: 1.2,
    paddingVertical: 1.5,
    paddingHorizontal: 5.5,
    borderRadius: 3,
  },
  tagText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    fontWeight: '700',
  },
  metaRow: {
    marginTop: 2,
  },
  subtitle: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
