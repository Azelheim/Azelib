import React from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { IconButton, Text } from 'react-native-paper';
import { View, Alert } from 'react-native';
import { LayoutDashboard, Book, Repeat, Users, FileText, Settings, Sun, LogOut } from 'lucide-react-native';
import { useTenant } from '../../lib/context/TenantContext';
import { clearLastActiveTenant } from '../../lib/session';

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { tenantNama, clearTenant } = useTenant();

  const isBukuActive = pathname.includes('buku');
  const isAnggotaActive = pathname.includes('anggota');

  const handleKeluarPerpustakaan = () => {
    Alert.alert('Keluar Perpustakaan', 'Kembali ke halaman pemilihan perpustakaan?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
        await clearLastActiveTenant();
        clearTenant();
        router.replace('/tenant-setup');
      }},
    ]);
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#F0F0F0',
        },
        headerTitle: "",
        headerLeft: () => (
          <View style={{ paddingLeft: 16 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{tenantNama || 'Perpustakaan'}</Text>
          </View>
        ),
        headerRight: () => (
          <View style={{ flexDirection: 'row', paddingRight: 8 }}>
            <IconButton icon={() => <Sun size={22} color="#000" />} onPress={() => Alert.alert('Info', 'Fitur tema belum tersedia untuk MVP')} />
            <IconButton icon={() => <Settings size={22} color="#000" />} onPress={() => router.push('/(admin)/pengaturan')} />
            <IconButton 
              icon={() => <LogOut size={22} color="#D32F2F" />} 
              onPress={handleKeluarPerpustakaan} 
              accessibilityLabel="Keluar Perpustakaan"
            />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          elevation: 0,
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#888888',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="buku"
        options={{
          title: 'Buku',
          tabBarIcon: ({ color }) => <Book size={24} color={isBukuActive ? '#000000' : color} />,
          tabBarLabel: ({ color }) => (
            <Text style={{ color: isBukuActive ? '#000000' : color, fontSize: 10, fontWeight: isBukuActive ? '600' : '400' }}>
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
          tabBarIcon: ({ color }) => <Repeat size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="anggota"
        options={{
          title: 'Anggota',
          tabBarIcon: ({ color }) => <Users size={24} color={isAnggotaActive ? '#000000' : color} />,
          tabBarLabel: ({ color }) => (
            <Text style={{ color: isAnggotaActive ? '#000000' : color, fontSize: 10, fontWeight: isAnggotaActive ? '600' : '400' }}>
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
          tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
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
  );
}
