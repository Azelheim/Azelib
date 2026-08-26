import React, { useEffect, useMemo } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { AzelheimThemeProvider, useAzelheimTheme, getPaperTheme } from '../lib/theme';
import NetInfo from '@react-native-community/netinfo';
import { initDb, syncWithCloud } from '../lib/db';
import { TenantProvider } from '../lib/context/TenantContext';

function RootNavigation() {
  const { isDark } = useAzelheimTheme();
  const paperTheme = useMemo(() => getPaperTheme(isDark), [isDark]);

  return (
    <PaperProvider theme={paperTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="tenant-setup" />
        <Stack.Screen name="pengunjung" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </PaperProvider>
  );
}

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
    <AzelheimThemeProvider>
      <TenantProvider>
        <RootNavigation />
      </TenantProvider>
    </AzelheimThemeProvider>
  );
}
