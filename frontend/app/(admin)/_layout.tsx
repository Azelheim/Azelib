import React, { useRef } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { View, Text, Alert, StyleSheet, Platform, Animated } from 'react-native';
import {
  LayoutDashboard,
  BookOpen,
  Repeat,
  Users,
  FileText,
  Sun,
  Moon,
  Settings2,
  Power,
} from 'lucide-react-native';
import { useTenant } from '../../lib/context/TenantContext';
import { clearLastActiveTenant } from '../../lib/session';
import { useAzelheimTheme } from '../../lib/theme';
import { AzelheimIconButton, AzelheimToast } from '../../lib/components/azelheim';

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, isDark, toggleTheme } = useAzelheimTheme();
  const {
    tenantNama,
    clearTenant,
    tokenNotification,
    clearTokenNotification,
  } = useTenant();

  const isBukuActive = pathname.includes('buku');
  const isAnggotaActive = pathname.includes('anggota');

  // Theme switch rotate animation
  const themeRotateAnim = useRef(new Animated.Value(0)).current;

  const handleToggleTheme = () => {
    Animated.timing(themeRotateAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      themeRotateAnim.setValue(0);
    });
    toggleTheme();
  };

  const spin = themeRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

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
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.bg,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1.2,
            borderBottomColor: colors.border,
            height: 68,
          },
          headerTitle: '',
          headerLeft: () => (
            <View style={styles.headerLeft}>
              <View style={styles.titleRow}>
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
              <Text style={[styles.headerSub, { color: colors.faint }]}>
                SYSTEM // CORE_LIB
              </Text>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <AzelheimIconButton
                  icon={
                    isDark ? (
                      <Moon size={19} color={colors.text} />
                    ) : (
                      <Sun size={19} color={colors.text} />
                    )
                  }
                  onPress={handleToggleTheme}
                  accessibilityLabel="Ganti Tema"
                  size={38}
                />
              </Animated.View>
              <AzelheimIconButton
                icon={<Settings2 size={19} color={colors.text} />}
                onPress={() => router.push('/(admin)/pengaturan')}
                accessibilityLabel="Pengaturan"
                size={38}
              />
              <AzelheimIconButton
                icon={<Power size={19} color={colors.danger} />}
                onPress={handleKeluarPerpustakaan}
                accessibilityLabel="Keluar Perpustakaan"
                size={38}
              />
            </View>
          ),
          tabBarStyle: {
            backgroundColor: colors.bg,
            borderTopWidth: 1.2,
            borderTopColor: colors.border,
            elevation: 0,
            height: 68,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 10 : 8,
          },
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.faint,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            marginTop: 3,
          },
          tabBarItemStyle: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, focused }) => (
              <LayoutDashboard
                size={21}
                color={focused ? colors.text : color}
                style={focused ? styles.activeIcon : undefined}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="buku"
          options={{
            title: 'Buku',
            tabBarIcon: ({ color, focused }) => (
              <BookOpen
                size={21}
                color={isBukuActive || focused ? colors.text : color}
                style={isBukuActive || focused ? styles.activeIcon : undefined}
              />
            ),
            tabBarLabel: ({ color }) => (
              <Text
                style={{
                  color: isBukuActive ? colors.text : color,
                  fontSize: 10,
                  fontWeight: isBukuActive ? '800' : '700',
                  marginTop: 3,
                }}
              >
                Buku
              </Text>
            ),
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
            tabBarIcon: ({ color, focused }) => (
              <Repeat
                size={21}
                color={focused ? colors.text : color}
                style={focused ? styles.activeIcon : undefined}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="anggota"
          options={{
            title: 'Anggota',
            tabBarIcon: ({ color, focused }) => (
              <Users
                size={21}
                color={isAnggotaActive || focused ? colors.text : color}
                style={isAnggotaActive || focused ? styles.activeIcon : undefined}
              />
            ),
            tabBarLabel: ({ color }) => (
              <Text
                style={{
                  color: isAnggotaActive ? colors.text : color,
                  fontSize: 10,
                  fontWeight: isAnggotaActive ? '800' : '700',
                  marginTop: 3,
                }}
              >
                Anggota
              </Text>
            ),
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
            tabBarIcon: ({ color, focused }) => (
              <FileText
                size={21}
                color={focused ? colors.text : color}
                style={focused ? styles.activeIcon : undefined}
              />
            ),
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
  headerLeft: {
    paddingLeft: 16,
    justifyContent: 'center',
    maxWidth: 220,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontWeight: '800',
    fontSize: 16.5,
    letterSpacing: -0.4,
  },
  brandTag: {
    borderWidth: 1.2,
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 3,
  },
  brandTagText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    fontWeight: '700',
  },
  headerSub: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    gap: 4,
  },
  activeIcon: {
    transform: [{ translateY: -2 }, { scale: 1.15 }],
  },
});
