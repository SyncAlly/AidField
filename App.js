// App.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { initDB } from './src/database/db';
import { colors } from './src/constants/colors';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const setupDB = async () => {
      try {
        await initDB();
        setDbReady(true);
      } catch (e) {
        console.error('DB init failed:', e);
        setError(e.message);
      }
    };
    setupDB();
  }, []);

  // Loading screen while DB initialises
  if (!dbReady && !error) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading AidField...</Text>
      </View>
    );
  }

  // Error screen
  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Failed to load: {error}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark,
    gap: 16,
  },
  loadingText: {
    color: colors.textLight,
    fontSize: 16,
  },
  errorText: {
    color: colors.urgencyRed,
    fontSize: 14,
    padding: 24,
    textAlign: 'center',
  },
});