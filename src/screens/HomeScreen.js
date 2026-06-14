// src/screens/HomeScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  StatusBar, ActivityIndicator, Keyboard, ScrollView,
  Image, Animated, Linking, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { searchScenarios, getSettings } from '../database/db';
import { getAIGuidance, getAIGuidanceWithImage, parseAIResponse } from '../services/claudeService';
import { isOnline } from '../services/connectivityService';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';

const QUICK_SCENARIOS = [
  { title: 'Cardiac Arrest / CPR', keywords: 'cardiac arrest cpr' },
  { title: 'Severe Bleeding', keywords: 'severe bleeding' },
  { title: 'Choking — Adult', keywords: 'choking adult' },
  { title: 'Anaphylaxis / Severe Allergy', keywords: 'anaphylaxis' },
  { title: 'Snake Bite', keywords: 'snake bite' },
  { title: 'Burns & Scalds', keywords: 'burns scalds' },
];

export default function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [quickScenarios, setQuickScenarios] = useState([]);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [language, setLanguage] = useState('en');
  const [pulseAnim] = useState(new Animated.Value(1));
  const stopRequested = useRef(false);
  const scrollViewRef = useRef(null);

  useSpeechRecognitionEvent('result', (event) => {
    const raw = event.results[0]?.transcript || '';
    setQuery(raw);
    if (event.isFinal) {
      stopPulse();
      setListening(false);
      if (raw.trim().length > 0) {
        processInput(raw.trim());
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    stopPulse();
    setListening(false);
    console.warn('Speech recognition error:', event.error, event.message);
  });

  useEffect(() => {
    checkConnectivity();
    loadQuickScenarios();

    // Reload settings when focusing
    const unsubscribeFocus = navigation.addListener('focus', () => {
      checkConnectivity();
    });

    // Stop speech when leaving the screen
    const unsubscribeBlur = navigation.addListener('blur', () => {
      stopRequested.current = true;
      Speech.stop();
      setSpeaking(false);
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
      Speech.stop();
    };
  }, [navigation]);

  useEffect(() => {
    if (ttsEnabled && aiResult && !aiResult.error) {
      speakAIResponse(aiResult);
    }
  }, [aiResult]);

  const checkConnectivity = async () => {
    const connected = await isOnline();
    setOnline(connected);
    try {
      const settings = await getSettings();
      setTtsEnabled(settings?.tts_enabled === 1);
      if (settings?.language) {
        setLanguage(settings.language);
      }
    } catch (e) { }
  };

  const loadQuickScenarios = async () => {
    try {
      const results = [];
      for (const s of QUICK_SCENARIOS) {
        const data = await searchScenarios(s.keywords);
        if (data.length > 0) results.push(data[0]);
      }
      setQuickScenarios(results);
    } catch (e) {
      console.error('Failed to load quick scenarios:', e);
    }
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // ── Voice ─────────────────────────────────────────────────────────────────
  const handleVoice = async () => {
    if (listening) {
      stopPulse();
      setListening(false);
      ExpoSpeechRecognitionModule.stop();
      if (query.trim().length > 0) await processInput(query.trim());
      return;
    }

    const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!p.granted) { alert('Microphone permission required for voice search.'); return; }

    setListening(true);
    setQuery('');
    setAiResult(null);
    startPulse();

    ExpoSpeechRecognitionModule.start({
      lang: language === 'sw' ? 'sw-KE' : 'en-US',
      interimResults: true,
      continuous: false,
    });
  };

  // ── Visual input ──────────────────────────────────────────────────────────
  const handleVisualInput = async () => {
    Alert.alert(
      'Visual Input',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const p = await ImagePicker.requestCameraPermissionsAsync();
            if (!p.granted) { alert('Camera permission needed.'); return; }

            const m = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!m.granted) { alert('Gallery permission needed to save photos.'); return; }

            const r = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.5,
              base64: true,
              saveToPhotos: true, // saves to gallery automatically
            });
            if (!r.canceled) {
              const asset = r.assets[0];
              setSelectedImage(asset);
              if (online) {
                // Send to AI immediately
                setLoading(true);
                setAiResult(null);
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                try {
                  const raw = await getAIGuidanceWithImage(
                    query.trim() || 'What first aid is needed for what you see in this image?',
                    asset.base64,
                    language
                  );
                  setAiResult(parseAIResponse(raw));
                } catch (e) {
                  console.warn('Image AI unavailable:', e.message);
                  setAiResult({
                    error: 'AI image analysis is temporarily unavailable. Type a description of the emergency in the search bar and tap Ask AI, or browse the Scenarios tab.'
                  });
                } finally {
                  setLoading(false);
                }
              } else {
                // Offline — photo saved to gallery, show message
                Alert.alert(
                  'Photo Saved',
                  'Your photo has been saved to your gallery. You are currently offline — connect to the internet to get AI analysis.',
                  [{ text: 'OK' }]
                );
              }
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!p.granted) { alert('Gallery permission needed.'); return; }
            const r = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.5,
              base64: true,
            });
            if (!r.canceled) {
              const asset = r.assets[0];
              setSelectedImage(asset);
              if (online) {
                setLoading(true);
                setAiResult(null);
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                try {
                  const raw = await getAIGuidanceWithImage(
                    query.trim() || 'What first aid is needed for what you see in this image?',
                    asset.base64,
                    language
                  );
                  setAiResult(parseAIResponse(raw));
                } catch (e) {
                  console.warn('Image AI unavailable:', e.message);
                  setAiResult({
                    error: 'AI image analysis is temporarily unavailable. Type a description of the emergency in the search bar and tap Ask AI, or browse the Scenarios tab.'
                  });
                } finally {
                  setLoading(false);
                }
              } else {
                Alert.alert(
                  'Offline',
                  'You are offline. Connect to the internet to get AI analysis of this image.',
                  [{ text: 'OK' }]
                );
              }
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ── Process input ─────────────────────────────────────────────────────────
  const processInput = async (text) => {
    Keyboard.dismiss();
    setLoading(true);
    setAiResult(null);
    Speech.stop();
    setSpeaking(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    const connected = await isOnline();
    setOnline(connected);

    if (!connected) {
      try {
        const offlineResults = await searchScenarios(text);
        navigation.navigate('ScenariosTab', {
          screen: 'Scenarios',
          params: { searchResults: offlineResults, searchQuery: text },
        });
      } catch (e) {
        console.error('Offline search failed:', e);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      let raw;
      if (selectedImage?.base64) {
        raw = await getAIGuidanceWithImage(text, selectedImage.base64, language);
      } else {
        raw = await getAIGuidance(text, language);
      }
      setAiResult(parseAIResponse(raw));
    } catch (e) {
      console.error('AI search failed:', e);
      setAiResult({ error: 'AI unavailable. Showing offline results.' });
      try {
        const offlineResults = await searchScenarios(text || 'emergency');
        navigation.navigate('ScenariosTab', {
          screen: 'Scenarios',
          params: { searchResults: offlineResults, searchQuery: text },
        });
      } catch (err) { }
    } finally {
      setLoading(false);
    }
  };

  // ── TTS ───────────────────────────────────────────────────────────────────
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
    if (parsed.immediate) {
      const immediatePrefix = language === 'sw' ? 'Hatua ya haraka. ' : 'Immediate action. ';
      lines.push(`${immediatePrefix}${parsed.immediate}`);
    }
    parsed.steps?.forEach((s, i) => {
      let stepPrefix;
      if (language === 'sw') {
        const swahiliOrdinals = {
          1: "kwanza",
          2: "pili",
          3: "tatu",
          4: "nne",
          5: "tano",
          6: "sita",
          7: "saba",
          8: "nane",
          9: "tisa",
          10: "kumi"
        };
        const ordinal = swahiliOrdinals[i + 1] || (i + 1);
        stepPrefix = `Hatua ya ${ordinal}. `;
      } else {
        stepPrefix = `Step ${i + 1}. `;
      }
      lines.push(`${stepPrefix}${s}`);
    });
    if (parsed.callNote) lines.push(parsed.callNote);

    for (let i = 0; i < lines.length; i++) {
      if (stopRequested.current) break;
      await new Promise((res) => {
        Speech.speak(lines[i], {
          language: language === 'sw' ? 'sw' : 'en', rate: 0.85,
          onDone: res, onError: res, onStopped: res,
        });
      });
    }
    setSpeaking(false);
    stopRequested.current = false;
  };

  const getUrgencyColor = (level) => {
    const l = level?.toLowerCase();
    if (l?.includes('life') || l === 'red') return colors.urgencyRed;
    if (l?.includes('urgent') || l === 'amber') return colors.urgencyAmber;
    return colors.urgencyGreen;
  };

  const clearAll = () => {
    stopRequested.current = true; // Tell the TTS loop to break
    Speech.stop();
    setSpeaking(false);
    setQuery('');
    setAiResult(null);
    setSelectedImage(null);
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      'Call Emergency Services?',
      'You are about to call 999',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 999', style: 'destructive',
          onPress: () => Linking.openURL('tel:999')
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.dark} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AidField</Text>
          <Text style={styles.headerSub}>Emergency first aid — offline ready</Text>
        </View>
        <View style={[styles.dot, { backgroundColor: online ? colors.online : colors.offline }]} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Emergency call card */}
        <TouchableOpacity
          style={styles.emergencyCard}
          onPress={handleEmergencyCall}
          activeOpacity={0.9}
        >
          <View style={styles.emergencyCardLeft}>
            <Text style={styles.emergencyCardTitle}>
              Life-Threatening Emergency?
            </Text>
            <Text style={styles.emergencyCardSub}>
              Unconscious · Not breathing · Severe bleeding
            </Text>
            <View style={styles.emergencyCallBtn}>
              <Ionicons name="call" size={16} color={colors.urgencyRed} />
              <Text style={styles.emergencyCallBtnText}>  Call 999 / 112</Text>
            </View>
          </View>
          <Ionicons name="alert-circle" size={32} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Describe the emergency..."
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
            }}
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => query.trim() && processInput(query.trim())}
          />
          {(query.length > 0 || aiResult || selectedImage) && (
            <TouchableOpacity onPress={clearAll} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Image preview */}
        {selectedImage && (
          <View style={styles.imagePreviewRow}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
            <View style={styles.imagePreviewInfo}>
              <Text style={styles.imagePreviewText}>Image attached</Text>
              <Text style={styles.imagePreviewSub}>Tap Ask AI to analyse</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedImage(null)} activeOpacity={0.8}>
              <Ionicons name="close-circle" size={22} color={colors.urgencyRed} />
            </TouchableOpacity>
          </View>
        )}



        {/* Ask AI button */}
        {(query.trim().length > 2 || selectedImage) && (
          <TouchableOpacity
            style={[styles.askBtn, !online && styles.askBtnOffline]}
            onPress={() => processInput(query.trim())}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons
              name={online ? 'sparkles' : 'book-outline'}
              size={18}
              color={colors.white}
            />
            <Text style={styles.askBtnText}>
              {online ? '  Ask AI' : '  Search Offline Scenarios'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickActionsRow}>

          {/* Visual Input */}
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={handleVisualInput}
            activeOpacity={0.85}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.purple }]}>
              <Ionicons name="camera" size={26} color={colors.white} />
            </View>
            <Text style={styles.quickActionTitle}>Visual Input</Text>
            <Text style={styles.quickActionSub}>
              {online ? 'Camera or gallery' : 'Camera or gallery'}
            </Text>
          </TouchableOpacity>

          {/* Voice Search */}
          <Animated.View
            style={[styles.quickActionCard, { transform: [{ scale: pulseAnim }] }]}
          >
            <TouchableOpacity
              style={{ alignItems: 'center', width: '100%' }}
              onPress={handleVoice}
              activeOpacity={0.85}
            >
              <View style={[
                styles.quickActionIcon,
                { backgroundColor: listening ? colors.urgencyRed : colors.primary }
              ]}>
                <Ionicons
                  name={listening ? 'stop' : 'mic'}
                  size={26}
                  color={colors.white}
                />
              </View>
              <Text style={styles.quickActionTitle}>
                {listening ? 'Listening...' : 'Voice Search'}
              </Text>
              <Text style={styles.quickActionSub}>
                {listening ? 'Tap to stop' : 'Describe aloud'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              {online ? 'Getting AI guidance...' : 'Searching scenarios...'}
            </Text>
          </View>
        )}

        {/* AI Result */}
        {aiResult && !aiResult.error && (
          <View style={styles.aiCard}>
            <View style={styles.aiBadgeRow}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color={colors.white} />
                <Text style={styles.aiBadgeText}>
                  {language === 'sw' ? '  Mwongozo wa AI' : '  AI Guidance'}
                </Text>
              </View>
              <View style={[
                styles.urgencyBadge,
                { backgroundColor: getUrgencyColor(aiResult.urgency) + '22' }
              ]}>
                <Text style={[
                  styles.urgencyBadgeText,
                  { color: getUrgencyColor(aiResult.urgency) }
                ]}>
                  {language === 'sw'
                    ? (aiResult.urgency?.toUpperCase().includes('LIFE') || aiResult.urgency === 'red' ? 'HATARI KWA MAISHA' :
                       aiResult.urgency?.toUpperCase().includes('URGENT') || aiResult.urgency === 'amber' ? 'YA HARAKA' : 'YA KIASI')
                    : aiResult.urgency}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.speakBtn, speaking && styles.speakBtnActive]}
                onPress={() => speakAIResponse(aiResult)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={speaking ? 'stop-circle' : 'volume-high'}
                  size={15}
                  color={speaking ? colors.white : colors.primary}
                />
                <Text style={[styles.speakBtnText, speaking && { color: colors.white }]}>
                  {speaking 
                    ? (language === 'sw' ? ' Acha' : ' Stop') 
                    : (language === 'sw' ? ' Sikiliza' : ' Listen')}
                </Text>
              </TouchableOpacity>
            </View>

            {aiResult.immediate ? (
              <View style={[
                styles.immediateBox,
                { borderLeftColor: getUrgencyColor(aiResult.urgency) }
              ]}>
                <Text style={styles.immediateLabel}>
                  {language === 'sw' ? '⚡ Fanya hivi sasa:' : '⚡ Do this now:'}
                </Text>
                <Text style={styles.immediateText}>{aiResult.immediate}</Text>
              </View>
            ) : null}

            {aiResult.steps?.length > 0 && (
              <>
                <Text style={styles.aiSectionTitle}>
                  {language === 'sw' ? 'Hatua' : 'Steps'}
                </Text>
                {aiResult.steps.map((step, i) => (
                  <View key={i} style={styles.aiStep}>
                    <View style={[
                      styles.aiStepNum,
                      { backgroundColor: getUrgencyColor(aiResult.urgency) }
                    ]}>
                      <Text style={styles.aiStepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.aiStepText}>{step}</Text>
                  </View>
                ))}
              </>
            )}

            {aiResult.resources?.length > 0 && (
              <>
                <Text style={styles.aiSectionTitle}>
                  {language === 'sw' ? 'Nyenzo Mbadala' : 'Improvised Resources'}
                </Text>
                {aiResult.resources.map((r, i) => (
                  <Text key={i} style={styles.aiResource}>• {r}</Text>
                ))}
              </>
            )}

            {aiResult.callNote ? (
              <View style={styles.callNote}>
                <Ionicons name="call" size={13} color={colors.urgencyRed} />
                <Text style={styles.callNoteText}>  {aiResult.callNote}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Error card */}
        {aiResult?.error && (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={22} color={colors.urgencyAmber} />
            <Text style={styles.errorCardText}>{aiResult.error}</Text>
          </View>
        )}

        {/* Critical emergencies */}
        {!aiResult && !loading && quickScenarios.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>CRITICAL EMERGENCIES</Text>
            {quickScenarios.map((item) => (
              <TouchableOpacity
                key={item.scenario_id}
                style={styles.criticalCard}
                onPress={() =>
                  navigation.navigate('Scenario', { scenarioId: item.scenario_id })
                }
                activeOpacity={0.75}
              >
                <View style={styles.criticalIconBox}>
                  <Ionicons name="warning" size={20} color={colors.urgencyRed} />
                </View>
                <View style={styles.criticalContent}>
                  <Text style={styles.criticalTitle}>{item.title}</Text>
                  <Text style={styles.criticalSummary} numberOfLines={1}>
                    {item.summary}
                  </Text>
                </View>
                <View style={[
                  styles.criticalBadge,
                  {
                    backgroundColor:
                      item.urgency_level === 'red' ? colors.redCard :
                        item.urgency_level === 'amber' ? '#FFF3E0' : '#E8F5E9'
                  }
                ]}>
                  <Text style={[
                    styles.criticalBadgeText,
                    { color: getUrgencyColor(item.urgency_level) }
                  ]}>
                    {item.urgency_level === 'red' ? 'CRITICAL' :
                      item.urgency_level === 'amber' ? 'URGENT' : 'MODERATE'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  // Error card
  errorCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: layout.radius.lg,
    padding: layout.spacing.md,
    marginBottom: layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.urgencyAmber + '55',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: layout.spacing.sm,
    ...layout.shadow,
  },
  errorCardText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
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
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.white },
  headerSub: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },

  scroll: { padding: layout.spacing.md },

  // Emergency card
  emergencyCard: {
    backgroundColor: colors.urgencyRed,
    borderRadius: layout.radius.lg,
    padding: layout.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: layout.spacing.md,
    ...layout.shadowStrong,
  },
  emergencyCardLeft: { flex: 1, marginRight: layout.spacing.md },
  emergencyCardTitle: {
    fontSize: 17, fontWeight: 'bold',
    color: colors.white, marginBottom: 4,
  },
  emergencyCardSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.85)',
    marginBottom: layout.spacing.md,
  },
  emergencyCallBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: layout.spacing.md,
    paddingVertical: 8,
    borderRadius: layout.radius.round,
    alignSelf: 'flex-start',
  },
  emergencyCallBtnText: {
    fontSize: 14, fontWeight: 'bold', color: colors.urgencyRed,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: layout.radius.round,
    paddingHorizontal: layout.spacing.md,
    paddingVertical: 12,
    gap: layout.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: layout.spacing.sm,
    ...layout.shadow,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },

  // Image preview
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.spacing.sm,
    backgroundColor: colors.white,
    borderRadius: layout.radius.md,
    padding: layout.spacing.sm,
    marginBottom: layout.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imagePreview: {
    width: 52, height: 52, borderRadius: layout.radius.sm,
  },
  imagePreviewInfo: { flex: 1 },
  imagePreviewText: {
    fontSize: 13, fontWeight: '600', color: colors.textPrimary,
  },
  imagePreviewSub: { fontSize: 11, color: colors.textSecondary },

  // Transcript
  transcriptBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: layout.radius.md,
    padding: layout.spacing.sm,
    marginBottom: layout.spacing.sm,
    borderWidth: 1, borderColor: colors.primary + '44',
  },
  transcriptText: {
    fontSize: 13, color: colors.primary,
    fontStyle: 'italic', flex: 1,
  },

  // Ask AI
  askBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: layout.radius.round,
    paddingVertical: 13,
    marginBottom: layout.spacing.md,
    ...layout.shadow,
  },
  askBtnOffline: { backgroundColor: colors.dark },
  askBtnText: { fontSize: 15, fontWeight: 'bold', color: colors.white },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: layout.spacing.sm,
    marginTop: layout.spacing.sm,
  },

  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: layout.spacing.md,
    marginBottom: layout.spacing.md,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: layout.radius.lg,
    padding: layout.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...layout.shadow,
  },
  quickActionIcon: {
    width: 52, height: 52,
    borderRadius: layout.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: layout.spacing.sm,
  },
  quickActionTitle: {
    fontSize: 13, fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center', marginBottom: 2,
  },
  quickActionSub: {
    fontSize: 11, color: colors.textSecondary, textAlign: 'center',
  },

  // Loading
  loadingBox: {
    alignItems: 'center',
    paddingVertical: layout.spacing.xl,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: colors.textSecondary },

  // AI card
  aiCard: {
    backgroundColor: colors.white,
    borderRadius: layout.radius.lg,
    padding: layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    marginBottom: layout.spacing.md,
    ...layout.shadow,
  },
  aiBadgeRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: layout.spacing.sm,
    marginBottom: layout.spacing.md,
    flexWrap: 'wrap',
  },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: layout.radius.round,
  },
  aiBadgeText: { fontSize: 11, fontWeight: 'bold', color: colors.white },
  urgencyBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: layout.radius.round,
  },
  urgencyBadgeText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  speakBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: layout.radius.round,
    borderWidth: 1.5, borderColor: colors.primary,
    backgroundColor: colors.white, marginLeft: 'auto',
  },
  speakBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  speakBtnText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  immediateBox: {
    backgroundColor: colors.background,
    borderRadius: layout.radius.sm,
    padding: layout.spacing.md,
    borderLeftWidth: 3,
    marginBottom: layout.spacing.sm,
  },
  immediateLabel: {
    fontSize: 12, fontWeight: '700',
    color: colors.textPrimary, marginBottom: 4,
  },
  immediateText: { fontSize: 14, color: colors.textPrimary, lineHeight: 21 },
  aiSectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textPrimary,
    marginBottom: layout.spacing.sm, marginTop: layout.spacing.sm,
  },
  aiStep: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: layout.spacing.sm,
  },
  aiStepNum: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: layout.spacing.sm, marginTop: 1,
  },
  aiStepNumText: { color: colors.white, fontWeight: 'bold', fontSize: 11 },
  aiStepText: { flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 21 },
  aiResource: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 4 },
  callNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.urgencyRed + '11',
    borderRadius: layout.radius.sm,
    padding: layout.spacing.sm,
    marginTop: layout.spacing.sm,
    borderWidth: 1, borderColor: colors.urgencyRed + '33',
  },
  callNoteText: { fontSize: 13, color: colors.urgencyRed, flex: 1, lineHeight: 19 },

  // Critical emergencies
  criticalCard: {
    backgroundColor: colors.white,
    borderRadius: layout.radius.md,
    marginBottom: layout.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    padding: layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: layout.spacing.sm,
    ...layout.shadow,
  },
  criticalIconBox: {
    width: 40, height: 40,
    borderRadius: layout.radius.sm,
    backgroundColor: colors.redCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  criticalContent: { flex: 1 },
  criticalTitle: {
    fontSize: 14, fontWeight: '600',
    color: colors.textPrimary, marginBottom: 2,
  },
  criticalSummary: { fontSize: 12, color: colors.textSecondary },
  criticalBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: layout.radius.round,
  },
  criticalBadgeText: { fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
});