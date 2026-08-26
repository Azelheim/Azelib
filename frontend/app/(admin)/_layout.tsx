import React, { useRef, useEffect } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { View, Text, Alert, StyleSheet, Platform, Animated, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  BookOpen,
  ArrowLeftRight,
  UsersRound,
  FileText,
  Sun,
  Moon,
  SlidersHorizontal,
  Power,
} from 'lucide-react-native';
import { useTenant } from '../../lib/context/TenantContext';
import { clearLastActiveTenant } from '../../lib/session';
import { useAzelheimTheme } from '../../lib/theme';
import { AzelheimIconButton, AzelheimToast } from '../../lib/components/azelheim';

// Custom 3-Zone Header
function AdminHeader({
  tenantNama,
  isDark,
  onToggleTheme,
  onOpenSettings,
  onLogout,
}: {
  tenantNama: string | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAzelheimTheme();

  // Animation values for action buttons
  const themeRotateAnim = useRef(new Animated.Value(0)).current;
  const settingsAnim = useRef(new Animated.Value(0)).current;
  const logoutAnim = useRef(new Animated.Value(0)).current;

  const handleThemePress = () => {
    Animated.spring(themeRotateAnim, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 4,
      speed: 12,
    }).start(() => {
      themeRotateAnim.setValue(0);
    });
    onToggleTheme();
  };

  const handleSettingsPress = () => {
    Animated.sequence([
      Animated.timing(settingsAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(settingsAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }),
    ]).start();
    onOpenSettings();
  };

  const handleLogoutPress = () => {
    Animated.sequence([
      Animated.timing(logoutAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(logoutAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 3,
        speed: 16,
      }),
    ]).start();
    onLogout();
  };

  const spin = themeRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const themeScale = themeRotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.82, 1],
  });

  const settingsTranslateY = settingsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2.5],
  });

  const settingsScale = settingsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const logoutScale = logoutAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });

  const logoutRotate = logoutAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-6deg'],
  });

  return (
    <View
      style={[
        styles.headerRoot,
        {
          backgroundColor: colors.bg,
          paddingTop: Math.max(insets.top, 8) + 4,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerInner}>
        {/* Zone 1 & 2: Header Main Row (Brand + Version strictly aligned with Action Group) */}
        <View style={styles.headerMainRow}>
          <View style={styles.brandGroup}>
            <Text
              style={[styles.headerTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {tenantNama || 'Azelheim'}
            </Text>
            <View
              style={[
                styles.brandTag,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text style={[styles.brandTagText, { color: colors.text }]}>
                v2.4
              </Text>
            </View>
          </View>

          {/* Action Group */}
          <View style={styles.actionGroup}>
            <Animated.View
              style={[
                styles.actionItemWrapper,
                { transform: [{ rotate: spin }, { scale: themeScale }] },
              ]}
            >
              <AzelheimIconButton
                icon={
                  isDark ? (
                    <Moon size={20} color={colors.text} />
                  ) : (
                    <Sun size={20} color={colors.text} />
                  )
                }
                onPress={handleThemePress}
                accessibilityLabel="Ganti Tema"
                size={42}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.actionItemWrapper,
                {
                  transform: [
                    { translateY: settingsTranslateY },
                    { scale: settingsScale },
                  ],
                },
              ]}
            >
              <AzelheimIconButton
                icon={<SlidersHorizontal size={20} color={colors.text} />}
                onPress={handleSettingsPress}
                accessibilityLabel="Pengaturan"
                size={42}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.actionItemWrapper,
                {
                  transform: [
                    { scale: logoutScale },
                    { rotate: logoutRotate },
                  ],
                },
              ]}
            >
              <AzelheimIconButton
                icon={<Power size={20} color={colors.danger} />}
                onPress={handleLogoutPress}
                accessibilityLabel="Keluar Perpustakaan"
                size={42}
              />
            </Animated.View>
          </View>
        </View>

        {/* Zone 3: Technical Meta Row */}
        <View style={styles.metaRow}>
          <Text style={[styles.headerSub, { color: colors.faint }]}>
            SYSTEM // CORE_LIB
          </Text>
        </View>
      </View>
    </View>
  );
}

// Custom Tab Item with Semantic Motion & Editorial Micro-indicator
function CustomTabItem({
  route,
  isFocused,
  onPress,
}: {
  route: { name: string; title: string; icon: any; motionType: 'default' | 'directional' };
  isFocused: boolean;
  onPress: () => void;
}) {
  const { colors } = useAzelheimTheme();
  const anim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      speed: 28,
      bounciness: 3,
    }).start();
  }, [isFocused]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2.5],
  });

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, route.motionType === 'directional' ? 1.5 : 0],
  });

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const indicatorScaleX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const indicatorOpacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.3, 1],
  });

  const labelOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const IconComponent = route.icon;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={route.title}
    >
      <View style={styles.tabItemInner}>
        <Animated.View
          style={[
            styles.tabIconWrapper,
            {
              transform: [{ translateY }, { translateX }, { scale }],
            },
          ]}
        >
          <IconComponent
            size={20}
            color={isFocused ? colors.text : colors.faint}
          />
        </Animated.View>

        <Animated.Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? colors.text : colors.faint,
              fontWeight: isFocused ? '800' : '600',
              opacity: labelOpacity,
            },
          ]}
        >
          {route.title}
        </Animated.Text>

        <Animated.View
          style={[
            styles.activeIndicator,
            {
              backgroundColor: colors.text,
              opacity: indicatorOpacity,
              transform: [{ scaleX: indicatorScaleX }],
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

// Custom Bottom Tab Bar
function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useAzelheimTheme();

  const tabRoutes = [
    { name: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, motionType: 'default' as const },
    { name: 'buku', title: 'Buku', icon: BookOpen, motionType: 'default' as const },
    { name: 'peminjaman', title: 'Peminjaman', icon: ArrowLeftRight, motionType: 'directional' as const },
    { name: 'anggota', title: 'Anggota', icon: UsersRound, motionType: 'default' as const },
    { name: 'laporan', title: 'Laporan', icon: FileText, motionType: 'default' as const },
  ];

  return (
    <View
      style={[
        styles.tabBarRoot,
        {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.tabBarContent}>
        {tabRoutes.map((tab) => {
          const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[routeIndex]?.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(tab.name);
            }
          };

          return (
            <CustomTabItem
              key={tab.name}
              route={tab}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function AdminLayout() {
  const router = useRouter();
  const { isDark, toggleTheme } = useAzelheimTheme();
  const {
    tenantNama,
    clearTenant,
    tokenNotification,
    clearTokenNotification,
  } = useTenant();

  const handleKeluarPerpustakaan = () => {
    Alert.alert(
      'Keluar Perpustakaan',
      'Kembali ke halaman pemilihan perpustakaan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await clearLastActiveTenant();
            clearTenant();
            router.replace('/tenant-setup');
          },
        },
      ]
    );
  };

  return (
    <>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          header: () => (
            <AdminHeader
              tenantNama={tenantNama}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              onOpenSettings={() => router.push('/(admin)/pengaturan')}
              onLogout={handleKeluarPerpustakaan}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
          }}
        />
        <Tabs.Screen
          name="buku"
          options={{
            title: 'Buku',
          }}
        />
        <Tabs.Screen
          name="buku-detail"
          options={{
            href: null,
            title: 'Detail Buku',
          }}
        />
        <Tabs.Screen
          name="peminjaman"
          options={{
            title: 'Peminjaman',
          }}
        />
        <Tabs.Screen
          name="anggota"
          options={{
            title: 'Anggota',
          }}
        />
        <Tabs.Screen
          name="anggota-detail"
          options={{
            href: null,
            title: 'Detail Anggota',
          }}
        />
        <Tabs.Screen
          name="laporan"
          options={{
            title: 'Laporan',
          }}
        />
        <Tabs.Screen
          name="pengaturan"
          options={{
            href: null,
            title: 'Pengaturan',
          }}
        />
      </Tabs>

      <AzelheimToast
        visible={!!tokenNotification}
        message={tokenNotification || ''}
        onDismiss={clearTokenNotification}
        duration={5000}
        bottomOffset={75}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerRoot: {
    borderBottomWidth: 1.2,
    paddingHorizontal: 16,
    paddingBottom: 11,
  },
  headerInner: {
    width: '100%',
  },
  headerMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    paddingRight: 8,
  },
  headerTitle: {
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: -0.4,
  },
  brandTag: {
    borderWidth: 1.2,
    paddingVertical: 1.5,
    paddingHorizontal: 5.5,
    borderRadius: 3,
  },
  brandTagText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    fontWeight: '700',
  },
  metaRow: {
    marginTop: 2,
  },
  headerSub: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionItemWrapper: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarRoot: {
    borderTopWidth: 1.2,
    elevation: 0,
    shadowOpacity: 0,
    paddingTop: 6,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  tabIconWrapper: {
    width: 32,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 9.5,
    marginTop: 2,
    textAlign: 'center',
  },
  activeIndicator: {
    width: 16,
    height: 2,
    borderRadius: 1,
    marginTop: 3,
  },
});
