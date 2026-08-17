import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { theme } from '../lib/theme';
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { initDb, syncWithCloud } from '../lib/db';
import { TenantProvider } from '../lib/context/TenantContext';

export default function RootLayout() {
  useEffect(() => {
    initDb();
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        syncWithCloud();
      }
    });
    return () => unsubscribe();
  }, []);
  return (
    <TenantProvider>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="tenant-setup" />
          <Stack.Screen name="pengunjung" />
          <Stack.Screen name="(admin)" />
        </Stack>
      </PaperProvider>
    </TenantProvider>
  );
}
