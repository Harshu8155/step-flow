import React, { useEffect, useCallback } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar, View, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import RootNavigator from './src/navigation/RootNavigator';
import { StepProvider } from './src/utils/StepContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/utils/AuthContext';
import { useAppFonts } from './src/theme/fonts';

// Deep linking: maps stepflowapp://<path> URLs to screens.
const linking = {
  prefixes: ['stepflowapp://'],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      Verify: 'verify',
      Export: 'export',
      HeartRate: 'heart-rate',
      MainTabs: {
        screens: {
          Home: 'home',
          Weekly: 'weekly',
          Stats: 'stats',
          Milestones: 'badges',
          Profile: 'profile',
        },
      },
    },
  },
};

function ThemedApp() {
  const { colors, isDark } = useTheme();

  // The Android system navigation bar (the gesture-pill strip below the tab bar)
  // is not part of the React tree, so its icon contrast has to be driven here and
  // re-applied whenever the theme flips. No-ops on iOS.
  //
  // Edge-to-edge is mandatory from SDK 54 on, which removed both of the calls
  // this used to make: the bar is now transparent and the screen's own
  // background shows through it, so there is no colour left to set, and
  // `setButtonStyleAsync` became `setStyle`. Its values describe the BAR, not
  // the buttons — 'dark' means a dark bar carrying light icons — so the mapping
  // is the inverse of the old button-style one.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setStyle(isDark ? 'dark' : 'light');
  }, [isDark]);

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    dark: isDark,
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme} linking={linking}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <RootNavigator />
    </NavigationContainer>
  );
}

// Hold the native splash until we're ready to paint. Without this the splash
// disappears the instant JS mounts, exposing a blank screen while the fonts and
// the saved session load — the flash the old `backgroundColor: '#fbf5fa'` view
// was papering over.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  // Load Sora + Plus Jakarta Sans before painting so text doesn't flash system font.
  const fontsReady = useAppFonts();

  const onReady = useCallback(() => {
    // Hides on the frame after the first real content lays out, so the handoff
    // from native splash to app is seamless rather than a blink.
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Returning null (not a coloured View) keeps the native splash visible.
  if (!fontsReady) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onReady}>
      <ThemeProvider>
        <AuthProvider>
          <StepProvider>
            <ThemedApp />
          </StepProvider>
        </AuthProvider>
      </ThemeProvider>
    </View>
  );
}
