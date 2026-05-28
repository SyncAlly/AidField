// src/screens/ScenariosScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, StatusBar, ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getCategories } from '../database/db';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';

export default function ScenariosScreen({ navigation, route }) {
  const [categories, setCategories]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery]     = useState('');

  useEffect(() => {
    if (route.params?.searchResults) {
      setCategories([]);
      setSearchResults(route.params.searchResults);
      setSearchQuery(route.params.searchQuery || '');
      setLoading(false);
    } else {
      setSearchResults([]);
      setSearchQuery('');
      loadCategories();
    }
  }, [route.params]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (e) {
      console.error('Failed to load categories:', e);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setSearchResults([]);
    setSearchQuery('');
    loadCategories();
  };

  const getUrgencyColor = (level) => {
    switch (level) {
      case 'red':   return colors.urgencyRed;
      case 'amber': return colors.urgencyAmber;
      case 'green': return colors.urgencyGreen;
      default:      return colors.primary;
    }
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: item.urgency_color || colors.primary }]}
      onPress={() => navigation.navigate('Category', { category: item })}
      activeOpacity={0.75}
    >
      <View style={[
        styles.iconBox,
        { backgroundColor: (item.urgency_color || colors.primary) + '22' }
      ]}>
        <Ionicons
          name={getIcon(item.icon_name)}
          size={28}
          color={item.urgency_color || colors.primary}
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
          <Text style={styles.headerTitle}>Scenarios</Text>
          <Text style={styles.headerSub}>
            {searchQuery ? `Results for "${searchQuery}"` : 'Browse emergency guides'}
          </Text>
        </View>
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={clearResults}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={16} color={colors.white} />
            <Text style={styles.clearBtnText}> Clear</Text>
          </TouchableOpacity>
        )}
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

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
        />
      ) : searchQuery ? (
        // ── Offline search results ──────────────────────────────────────────
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {searchResults.length > 0 ? (
            <>
              <Text style={styles.resultsCount}>
                {searchResults.length} scenario{searchResults.length !== 1 ? 's' : ''} found
              </Text>
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.scenario_id}
                  style={styles.resultCard}
                  onPress={() => navigation.navigate('Scenario', { scenarioId: item.scenario_id })}
                  activeOpacity={0.75}
                >
                  <View style={[
                    styles.urgencyBar,
                    { backgroundColor: getUrgencyColor(item.urgency_level) }
                  ]} />
                  <View style={styles.resultContent}>
                    <View style={styles.resultTop}>
                      <Text style={styles.resultTitle}>{item.title}</Text>
                      <View style={[
                        styles.urgencyBadge,
                        { backgroundColor: getUrgencyColor(item.urgency_level) + '22' }
                      ]}>
                        <Text style={[
                          styles.urgencyBadgeText,
                          { color: getUrgencyColor(item.urgency_level) }
                        ]}>
                          {item.urgency_level?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.resultSummary} numberOfLines={2}>
                      {item.summary}
                    </Text>
                    {item.category_name && (
                      <Text style={styles.resultCategory}>
                        <Ionicons name="folder-outline" size={11} /> {item.category_name}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <View style={styles.noResultsBox}>
              <View style={styles.noResultsIconCircle}>
                <Ionicons name="search-outline" size={32} color={colors.textSecondary} />
              </View>
              <Text style={styles.noResultsTitle}>No Scenarios Found</Text>
              <Text style={styles.noResultsSub}>
                We couldn't find any offline guides matching "{searchQuery}".
              </Text>
              <View style={styles.suggestionsBox}>
                <Text style={styles.suggestionTitle}>Suggestions:</Text>
                <Text style={styles.suggestionText}>• Check spelling or try different keywords</Text>
                <Text style={styles.suggestionText}>• Keep search terms simple (e.g., "burn", "bleed")</Text>
              </View>
              <TouchableOpacity
                style={styles.browseAllBtn}
                onPress={clearResults}
                activeOpacity={0.8}
              >
                <Ionicons name="grid-outline" size={16} color={colors.white} />
                <Text style={styles.browseAllText}>  Browse All Categories</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        // ── Category list ───────────────────────────────────────────────────
        <FlatList
          data={categories}
          keyExtractor={(item) => item.category_id.toString()}
          renderItem={renderCategory}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="medical-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No scenarios available</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function getIcon(name) {
  const map = {
    'heart': 'heart', 'bandage': 'bandage', 'flame': 'flame',
    'alert-circle': 'alert-circle', 'bone': 'fitness', 'skull': 'skull',
    'bug': 'bug', 'zap': 'flash', 'alert-triangle': 'warning',
    'thermometer': 'thermometer', 'brain': 'medical',
  };
  return map[name] || 'medkit';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.dark,
    paddingHorizontal: layout.spacing.md,
    paddingTop: layout.spacing.sm,
    paddingBottom: layout.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.white },
  headerSub: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: layout.radius.round,
  },
  clearBtnText: { fontSize: 12, color: colors.white, fontWeight: '600' },
  emergencyBanner: {
    backgroundColor: colors.urgencyRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: layout.spacing.sm,
  },
  emergencyText: { color: colors.white, fontWeight: 'bold', fontSize: 13 },
  list: { padding: layout.spacing.md, paddingBottom: layout.spacing.xl },
  resultsCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: layout.spacing.md,
    fontWeight: '600',
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
    width: 48, height: 48,
    borderRadius: layout.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: layout.spacing.md,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  cardDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: layout.radius.md,
    marginBottom: layout.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...layout.shadow,
  },
  urgencyBar: { width: 4, alignSelf: 'stretch' },
  resultContent: { flex: 1, padding: layout.spacing.md },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 15, fontWeight: '600',
    color: colors.textPrimary, flex: 1,
    marginRight: layout.spacing.sm,
  },
  urgencyBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: layout.radius.round,
  },
  urgencyBadgeText: { fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  resultSummary: {
    fontSize: 12, color: colors.textSecondary,
    lineHeight: 18, marginBottom: 4,
  },
  resultCategory: { fontSize: 11, color: colors.textSecondary },
  empty: {
    flex: 1, alignItems: 'center',
    paddingTop: 80, gap: 12,
  },
  emptyText: { fontSize: 15, color: colors.textSecondary },
  noResultsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.spacing.lg,
    paddingTop: 60,
  },
  noResultsIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: layout.spacing.md,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: layout.spacing.xs,
  },
  noResultsSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: layout.spacing.lg,
  },
  suggestionsBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    width: '100%',
    marginBottom: layout.spacing.xl,
    ...layout.shadow,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: layout.spacing.xs,
  },
  suggestionText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  browseAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: layout.radius.round,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    ...layout.shadow,
  },
  browseAllText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
});