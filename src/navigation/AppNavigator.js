// src/navigation/AppNavigator.js
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';

// ── Screens ──────────────────────────────────────────────────────────────────
import HomeScreen        from '../screens/HomeScreen';
import ScenariosScreen   from '../screens/ScenariosScreen';
import CategoryScreen    from '../screens/CategoryScreen';
import ScenarioScreen    from '../screens/ScenarioScreen';
import SettingsScreen    from '../screens/SettingsScreen';
import EmergencyScreen   from '../screens/EmergencyScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Scenarios Stack ───────────────────────────────────────────────────────────
function ScenariosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Scenarios" component={ScenariosScreen} />
      <Stack.Screen name="Category"  component={CategoryScreen} />
      <Stack.Screen name="Scenario"  component={ScenarioScreen} />
    </Stack.Navigator>
  );
}

// ── Home Stack ────────────────────────────────────────────────────────────────
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"     component={HomeScreen} />
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

// ── Root Tab Navigator ────────────────────────────────────────────────────────
export default function AppNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.white,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 52 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'HomeTab') {
              iconName = focused ? 'search' : 'search-outline';
            } else if (route.name === 'ScenariosTab') {
              iconName = focused ? 'book' : 'book-outline';
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
          options={{ tabBarLabel: 'Search' }}
        />
        <Tab.Screen
          name="ScenariosTab"
          component={ScenariosStack}
          options={{ tabBarLabel: 'Scenarios' }}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsStack}
          options={{ tabBarLabel: 'Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}