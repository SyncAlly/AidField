// src/navigation/AppNavigator.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../constants/colors';
import { layout } from '../constants/layout';

// ── Screens ──────────────────────────────────────────────────────────────────
import HomeScreen        from '../screens/HomeScreen';
import CategoryScreen    from '../screens/CategoryScreen';
import ScenarioScreen    from '../screens/ScenarioScreen';
import SearchScreen      from '../screens/SearchScreen';
import VoiceScreen       from '../screens/VoiceScreen';
import SettingsScreen    from '../screens/SettingsScreen';
import EmergencyScreen   from '../screens/EmergencyScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Home Stack ────────────────────────────────────────────────────────────────
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"     component={HomeScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="Scenario" component={ScenarioScreen} />
    </Stack.Navigator>
  );
}

// ── Search Stack ──────────────────────────────────────────────────────────────
function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Search"  component={SearchScreen} />
      <Stack.Screen name="Scenario" component={ScenarioScreen} />
    </Stack.Navigator>
  );
}

// ── Settings Stack ────────────────────────────────────────────────────────────
function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings"  component={SettingsScreen} />
      <Stack.Screen name="Emergency" component={EmergencyScreen} />
    </Stack.Navigator>
  );
}

// ── Emergency FAB (floating button shown on all tabs) ────────────────────────
function EmergencyFAB({ navigation }) {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => navigation.navigate('SettingsTab', { screen: 'Emergency' })}
      activeOpacity={0.85}
    >
      <Ionicons name="call" size={22} color={colors.white} />
    </TouchableOpacity>
  );
}

// ── Root Tab Navigator ────────────────────────────────────────────────────────
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'SearchTab') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'VoiceTab') {
            iconName = focused ? 'mic' : 'mic-outline';
          } else if (route.name === 'SettingsTab') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarButton: (props) => (
          <TouchableOpacity {...props} activeOpacity={0.7} />
        ),
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{ tabBarLabel: 'Search' }}
      />
      <Tab.Screen
        name="VoiceTab"
        component={VoiceScreen}
        options={{ tabBarLabel: 'Voice' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

// ── App Navigator (root) ──────────────────────────────────────────────────────
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: layout.tabBarHeight,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.urgencyRed,
    justifyContent: 'center',
    alignItems: 'center',
    ...layout.shadowStrong,
  },
});