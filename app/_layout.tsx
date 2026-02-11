import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import 'react-native-reanimated';
import * as NativeSplashScreen from 'expo-splash-screen';

import { SplashScreen } from '@/components/splash-screen';

import { Colors } from '@/constants/theme';
import { initializeDatabase } from '@/database/sqlite';
import { useTheme } from '@/hooks/use-theme';
import { AppThemeProvider } from '@/providers/theme-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

function NavigationContainer() {
  const { colorScheme } = useTheme();

  // Database initialization moved to RootLayout for better control
  // but we can keep a listener here if needed


  const navigationTheme = colorScheme === 'dark'
    ? {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        primary: Colors.dark.tint,
        background: Colors.dark.background,
        card: Colors.dark.card,
        text: Colors.dark.text,
        border: Colors.dark.border,
      },
    }
    : {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: Colors.light.tint,
        background: Colors.light.background,
        card: Colors.light.card,
        text: Colors.light.text,
        border: Colors.light.border,
      },
    };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="habit-features" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        // Prevent native splash screen from auto-hiding
        await NativeSplashScreen.preventAutoHideAsync();

        // Initialize database and other resources
        initializeDatabase();

        // Add a small delay for smoother transition if needed or to ensure db is ready
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        // Application is ready to render
        setAppIsReady(true);
        // Hide the native splash screen immediately so our custom React splash is visible
        await NativeSplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  const onSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <AppThemeProvider>
      <NavigationContainer />
      {showSplash && <SplashScreen onFinish={onSplashFinish} />}
    </AppThemeProvider>
  );
}
