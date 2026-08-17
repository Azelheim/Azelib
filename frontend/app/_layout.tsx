import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { theme } from '../lib/theme';
import { useEffect } from 'react';

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="tenant-setup" />
        <Stack.Screen name="pengunjung/index" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </PaperProvider>
  );
}
