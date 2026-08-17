import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { IconButton, Text } from 'react-native-paper';
import { View } from 'react-native';
import { LayoutDashboard, Book, Repeat, Users, FileText, Settings } from 'lucide-react-native';

export default function AdminLayout() {
  const router = useRouter();
  
  // Nanti nama tenant didapat dari context/state
  const tenantName = "Perpustakaan Utama";

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0, // flat
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#F0F0F0',
        },
        headerTitle: "",
        headerLeft: () => (
          <View style={{ paddingLeft: 16 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{tenantName}</Text>
          </View>
        ),
        headerRight: () => (
          <View style={{ flexDirection: 'row', paddingRight: 8 }}>
            <IconButton icon="theme-light-dark" iconColor="#000" onPress={() => {}} />
            <IconButton icon={() => <Settings size={24} color="#000" />} onPress={() => router.push('/(admin)/pengaturan')} />
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
          headerShown: false, // Buku uses Stack inside for list/detail
          tabBarIcon: ({ color }) => <Book size={24} color={color} />,
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
          headerShown: false, // Anggota might use stack for list/detail
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
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
          href: null, // Hidden from bottom tabs
          title: 'Pengaturan',
        }}
      />
    </Tabs>
  );
}
