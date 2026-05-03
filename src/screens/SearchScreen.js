// src/screens/SearchScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, StatusBar,
  ActivityIndicator, Keyboard, ScrollView, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { searchScenarios } from '../database/db';
import { getAIGuidance, getAIGuidanceWithImage, parseAIResponse } from '../services/claudeService';
import { isOnline } from '../services/connectivityService';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';

export default function SearchScreen({ navigation }) {
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState([]);
  const [aiResult, setAiResult]         = useState(null);
  const [loading, setLoading]           = useState(false);
  const [searched, setSearched]         = useState(false);
  const [online, setOnline]             = useState(false);
  const [mode, setMode]                 = useState('offline');
  const [selectedImage, setSelectedImage] = useState(null);
  const [speaking, setSpeaking]         = useState(false);
  const stopRequested                   = useRef(false);

  const handleSearch = useCallback(async (text) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      setAiResult(null);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const offlineData = await searchScenarios(text.trim());
      setResults(offlineData);
      const connected = await isOnline();
      setOnline(connected);
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAISearch = async () => {
    if (!query.trim() && !selectedImage) return;
    Keyboard.dismiss();
    setLoading(true);
    setAiResult(null);
    setMode('ai');
    Speech.stop();
    setSpeaking(false);
    try {
      let raw;
      if (selectedImage?.base64) {
        raw = await getAIGuidanceWithImage(query.trim(), selectedImage.base64);
      } else {
        raw = await getAIGuidance(query.trim());
      }
      const parsed = parseAIResponse(raw);
      setAiResult(parsed);
    } catch (e) {
      console.error('AI search failed:', e);
      setAiResult({ error: 'AI unavailable. Using offline results below.' });
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    Speech.stop();
    setSpeaking(false);
    setQuery('');
    setResults([]);
    setAiResult(null);
    setSearched(false);
    setMode('offline');
    setSelectedImage(null);
    stopRequested.current = false;
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('Permission needed to access photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      alert('Permission needed to use camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const removeImage = () => setSelectedImage(null);

  const speakAIResponse = async (parsed) => {
    if (speaking) {
      stopRequested.current = true;
      Speech.stop();
      setSpeaking(false);
      return;
    }
    stopRequested.current = false;
    setSpeaking(true);

    const lines = [];
    if (parsed.immediate) lines.push(`Immediate action. ${parsed.immediate}`);
    parsed.steps.forEach((step, i) => lines.push(`Step ${i + 1}. ${step}`));
    if (parsed.callNote) lines.push(parsed.callNote);

    for (let i = 0; i < lines.length; i++) {
      if (stopRequested.current) break;
      await new Promise((resolve) => {
        Speech.speak(lines[i], {
          language: 'en',
          rate: 0.85,
          onDone: resolve,
          onError: resolve,
          onStopped: resolve,
        });
      });
    }
    setSpeaking(false);
    stopRequested.current = false;
  };

  const getUrgencyColor = (level) => {
    const l = level?.toLowerCase();
    if (l?.includes('life')) return colors.urgencyRed;
    if (l?.includes('urgent')) return colors.urgencyAmber;
    if (l?.includes('moderate')) return colors.urgencyGreen;
    switch (l) {
      case 'red':   return colors.urgencyRed;
      case 'amber': return colors.urgencyAmber;
      case 'green': return colors.urgencyGreen;
      default:      return colors.primary;
    }
  };

  const renderOfflineResult = (item) => {
    const urgencyColor = getUrgencyColor(item.urgency_level);
    return (
      <TouchableOpacity
        key={item.scenario_id}
        style={styles.card}
        onPress={() => {
          Keyboard.dismiss();
          navigation.navigate('Scenario', { scenarioId: item.scenario_id });
        }}
        activeOpacity={0.75}
      >
        <View style={[styles.urgencyBar, { backgroundColor: urgencyColor }]} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardCategory}>
            <Ionicons name="folder-outline" size={12} /> {item.category_name}
          </Text>
          <Text style={styles.cardSummary} numberOfLines={2}>
            {item.summary}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
      </TouchableOpacity>
    );
  };

  const renderAIResult = () => {
    if (!aiResult) return null;

    if (aiResult.error) {
      return (
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={20} color={colors.urgencyAmber} />
          <Text style={styles.errorText}>  {aiResult.error}</Text>
        </View>
      );
    }

    const urgencyColor = getUrgencyColor(aiResult.urgency);

    return (
      <View style={styles.aiCard}>
        {/* Top row — AI badge, urgency, listen button */}
        <View style={styles.aiBadgeRow}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color={colors.white} />
            <Text style={styles.aiBadgeText}>  AI Guidance</Text>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '22' }]}>
            <Text style={[styles.urgencyBadgeText, { color: urgencyColor }]}>
              {aiResult.urgency}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.speakBtn, speaking && styles.speakBtnActive]}
            onPress={() => speakAIResponse(aiResult)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={speaking ? 'stop-circle' : 'volume-high'}
              size={16}
              color={speaking ? colors.white : colors.primary}
            />
            <Text style={[styles.speakBtnText, speaking && { color: colors.white }]}>
              {speaking ? ' Stop' : ' Listen'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Immediate action */}
        {aiResult.immediate ? (
          <View style={[styles.immediateBox, { borderLeftColor: urgencyColor }]}>
            <Text style={styles.immediateLabel}>⚡ Do this now:</Text>
            <Text style={styles.immediateText}>{aiResult.immediate}</Text>
          </View>
        ) : null}

        {/* Steps */}
        {aiResult.steps?.length > 0 && (
          <>
            <Text style={styles.aiSectionTitle}>Steps</Text>
            {aiResult.steps.map((step, i) => (
              <View key={i} style={styles.aiStep}>
                <View style={[styles.aiStepNum, { backgroundColor: urgencyColor }]}>
                  <Text style={styles.aiStepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.aiStepText}>{step}</Text>
              </View>
            ))}
          </>
        )}

        {/* Resources */}
        {aiResult.resources?.length > 0 && (
          <>
            <Text style={styles.aiSectionTitle}>Improvised Resources</Text>
            {aiResult.resources.map((r, i) => (
              <Text key={i} style={styles.aiResource}>• {r}</Text>
            ))}
          </>
        )}

        {/* Call note */}
        {aiResult.callNote ? (
          <View style={styles.callNote}>
            <Ionicons name="call" size={14} color={colors.urgencyRed} />
            <Text style={styles.callNoteText}>  {aiResult.callNote}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.dark} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <Text style={styles.headerSub}>Find emergency guidance fast</Text>
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

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Describe the emergency..."
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={handleSearch}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Camera and gallery buttons */}
        <View style={styles.imageRow}>
          <TouchableOpacity
            style={styles.imageBtn}
            onPress={takePhoto}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={18} color={colors.primary} />
            <Text style={styles.imageBtnText}> Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imageBtn}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <Ionicons name="image" size={18} color={colors.primary} />
            <Text style={styles.imageBtnText}> Gallery</Text>
          </TouchableOpacity>

          {selectedImage && (
            <View style={styles.imagePreviewBox}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.imagePreview}
              />
              <TouchableOpacity
                style={styles.imageRemove}
                onPress={removeImage}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={20} color={colors.urgencyRed} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Ask AI button */}
        {(query.trim().length > 2 || selectedImage) && (
          <TouchableOpacity
            style={[styles.aiBtn, !online && styles.aiBtnDisabled]}
            onPress={handleAISearch}
            disabled={!online || loading}
            activeOpacity={0.8}
          >
            <Ionicons
              name="sparkles"
              size={16}
              color={online ? colors.white : colors.textLight}
            />
            <Text style={[styles.aiBtnText, !online && { color: colors.textLight }]}>
              {online ? '  Ask AI' : '  Offline — AI unavailable'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick chips */}
      {!searched && (
        <View style={styles.chips}>
          <Text style={styles.chipsLabel}>Quick search:</Text>
          <View style={styles.chipsRow}>
            {['CPR', 'bleeding', 'burn', 'choking', 'snake bite'].map((chip) => (
              <TouchableOpacity
                key={chip}
                style={styles.chip}
                onPress={() => handleSearch(chip)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {mode === 'ai' ? 'Getting AI guidance...' : 'Searching...'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* AI result */}
          {mode === 'ai' && renderAIResult()}

          {/* Offline results */}
          {results.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>
                {mode === 'ai' ? 'OFFLINE MATCHES' : 'RESULTS'}
              </Text>
              {results.map((item) => renderOfflineResult(item))}
            </>
          )}

          {/* Empty state */}
          {searched && results.length === 0 && !aiResult && (
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>
                Try different keywords or tap Ask AI for intelligent guidance
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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
    paddingHorizontal: layout.spacing.md,
    paddingTop: layout.spacing.sm,
    paddingBottom: layout.spacing.md,
  },
  headerTitle: {
    fontSize: 22,
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
  searchContainer: {
    padding: layout.spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: layout.spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: layout.radius.round,
    paddingHorizontal: layout.spacing.md,
    paddingVertical: 10,
    gap: layout.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.spacing.sm,
    flexWrap: 'wrap',
  },
  imageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.spacing.md,
    paddingVertical: 8,
    borderRadius: layout.radius.round,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  imageBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  imagePreviewBox: {
    position: 'relative',
  },
  imagePreview: {
    width: 52,
    height: 52,
    borderRadius: layout.radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: layout.radius.round,
    paddingVertical: 10,
  },
  aiBtnDisabled: {
    backgroundColor: colors.border,
  },
  aiBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  chips: {
    paddingHorizontal: layout.spacing.md,
    paddingTop: layout.spacing.md,
  },
  chipsLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: layout.spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.spacing.sm,
  },
  chip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: layout.spacing.md,
    paddingVertical: 6,
    borderRadius: layout.radius.round,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  chipText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  list: {
    padding: layout.spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: layout.spacing.sm,
    marginTop: layout.spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: layout.radius.md,
    marginBottom: layout.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    ...layout.shadow,
  },
  urgencyBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    padding: layout.spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cardSummary: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  aiCard: {
    backgroundColor: colors.card,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    marginBottom: layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    ...layout.shadow,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.spacing.sm,
    marginBottom: layout.spacing.md,
    flexWrap: 'wrap',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: layout.radius.round,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: layout.radius.round,
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  speakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: layout.radius.round,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    marginLeft: 'auto',
  },
  speakBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  speakBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  immediateBox: {
    backgroundColor: colors.background,
    borderRadius: layout.radius.sm,
    padding: layout.spacing.md,
    borderLeftWidth: 3,
    marginBottom: layout.spacing.md,
  },
  immediateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  immediateText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  aiSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: layout.spacing.sm,
    marginTop: layout.spacing.sm,
  },
  aiStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: layout.spacing.sm,
  },
  aiStepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: layout.spacing.sm,
    marginTop: 1,
  },
  aiStepNumText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  aiStepText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  aiResource: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  callNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.urgencyRed + '11',
    borderRadius: layout.radius.sm,
    padding: layout.spacing.sm,
    marginTop: layout.spacing.sm,
    borderWidth: 1,
    borderColor: colors.urgencyRed + '33',
  },
  callNoteText: {
    fontSize: 13,
    color: colors.urgencyRed,
    flex: 1,
    lineHeight: 19,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.urgencyAmber + '18',
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    marginBottom: layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.urgencyAmber + '44',
  },
  errorText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  emptyBox: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: layout.spacing.xl,
  },
});