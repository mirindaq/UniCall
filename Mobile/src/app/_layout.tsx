import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import Toast from 'react-native-toast-message';

import { GlobalCallOverlay } from '@/components/call/GlobalCallOverlay';
import { CallProvider } from '@/contexts/call-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <CallProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <GlobalCallOverlay />
      </CallProvider>
      <Toast />
    </ThemeProvider>
  );
}
