// src/screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, StatusBar, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getCategories } from '../database/db';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';

export default function HomeScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (e) {
      console.error('Failed to load categories:', e);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (color) => color || colors.primary;

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: getUrgencyColor(item.urgency_color) }]}
      onPress={() => navigation.navigate('Category', { category: item })}
      activeOpacity={0.75}
    >
      <View style={[styles.iconBox, { backgroundColor: getUrgencyColor(item.urgency_color) + '22' }]}>
        <Ionicons
          name={getIcon(item.icon_name)}
          size={28}
          color={getUrgencyColor(item.urgency_color)}
        />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{item.category_name}</Text>
        <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.dark} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AidField</Text>
          <Text style={styles.headerSub}>Select an emergency category</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Emergency banner */}
      <TouchableOpacity
        style={styles.emergencyBanner}
        onPress={() => navigation.navigate('SettingsTab', { screen: 'Emergency' })}
        activeOpacity={0.85}
      >
        <Ionicons name="call" size={18} color={colors.white} />
        <Text style={styles.emergencyText}>  Emergency Call — 999 / 112</Text>
      </TouchableOpacity>

      {/* Category list */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
        />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.category_id.toString()}
          renderItem={renderCategory}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// Map icon names from DB to Ionicons names
function getIcon(name) {
  const map = {
    'heart':          'heart',
    'bandage':        'bandage',
    'flame':          'flame',
    'alert-circle':   'alert-circle',
    'bone':           'fitness',
    'skull':          'skull',
    'bug':            'bug',
    'zap':            'flash',
    'alert-triangle': 'warning',
    'thermometer':    'thermometer',
    'brain':          'medical',
  };
  return map[name] || 'medkit';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.dark,
    paddingHorizontal: layout.spacing.md,
    paddingTop: layout.spacing.sm,
    paddingBottom: layout.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.online,
  },
  emergencyBanner: {
    backgroundColor: colors.urgencyRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: layout.spacing.sm,
  },
  emergencyText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  list: {
    padding: layout.spacing.md,
    paddingBottom: layout.spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    marginBottom: layout.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    ...layout.shadow,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: layout.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: layout.spacing.md,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});