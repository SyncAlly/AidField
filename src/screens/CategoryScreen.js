// src/screens/CategoryScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, StatusBar, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getScenariosByCategory } from '../database/db';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';

export default function CategoryScreen({ navigation, route }) {
  const { category } = route.params;
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await getScenariosByCategory(category.category_id);
      setScenarios(data);
    } catch (e) {
      console.error('Failed to load scenarios:', e);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyLabel = (level) => {
    switch (level) {
      case 'red':   return { label: 'LIFE-THREATENING', color: colors.urgencyRed };
      case 'amber': return { label: 'URGENT',           color: colors.urgencyAmber };
      case 'green': return { label: 'MODERATE',         color: colors.urgencyGreen };
      default:      return { label: 'UNKNOWN',          color: colors.textSecondary };
    }
  };

  const renderScenario = ({ item }) => {
    const urgency = getUrgencyLabel(item.urgency_level);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Scenario', { scenarioId: item.scenario_id })}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.urgencyBadge, { backgroundColor: urgency.color + '22' }]}>
            <Text style={[styles.urgencyText, { color: urgency.color }]}>
              {urgency.label}
            </Text>
          </View>
        </View>
        <Text style={styles.cardSummary}>{item.summary}</Text>
  
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.dark} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{category.category_name}</Text>
          <Text style={styles.headerSub}>Select a scenario</Text>
        </View>
      </View>

      {/* Emergency banner */}
      <TouchableOpacity
        style={styles.emergencyBanner}
        onPress={() => navigation.navigate('SettingsTab', { screen: 'Emergency' })}
        activeOpacity={0.85}
      >
        <Ionicons name="call" size={16} color={colors.white} />
        <Text style={styles.emergencyText}>  Emergency Call — 999 / 112</Text>
      </TouchableOpacity>

      {/* Scenarios */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
        />
      ) : scenarios.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="construct-outline" size={48} color={colors.textLight} />
          <Text style={styles.emptyText}>More scenarios coming soon</Text>
        </View>
      ) : (
        <FlatList
          data={scenarios}
          keyExtractor={(item) => item.scenario_id.toString()}
          renderItem={renderScenario}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.dark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.spacing.md,
    paddingVertical: layout.spacing.md,
  },
  backBtn: {
    marginRight: layout.spacing.md,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
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
    fontSize: 13,
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
    borderWidth: 1,
    borderColor: colors.border,
    ...layout.shadow,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: layout.spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: layout.spacing.sm,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: layout.radius.round,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardSummary: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: layout.spacing.sm,
  },
  
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});