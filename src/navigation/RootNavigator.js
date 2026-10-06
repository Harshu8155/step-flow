import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Loader } from '../components';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../utils/AuthContext';

import TabNavigator from './TabNavigator';
import ExportScreen from '../screens/ExportScreen';
import HeartRateScreen from '../screens/HeartRateScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyScreen from '../screens/VerifyScreen';

const Stack = createNativeStackNavigator();

// RootNavigator.js

export default function RootNavigator() {
  const { colors } = useTheme();
  const { initializing, isAuthenticated } = useAuth();

  if (initializing) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <Loader size={72} label="Loading your steps…" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'none',
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="Export" component={ExportScreen} />
          <Stack.Screen name="HeartRate" component={HeartRateScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Verify" component={VerifyScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
