// src/screens/VoiceScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, ActivityIndicator, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { searchScenarios } from '../database/db';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';

export default function VoiceScreen({ navigation }) {
  const [listening, setListening]     = useState(false);
  const [transcript, setTranscript]   = useState('');
  const [results, setResults]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState('idle'); // idle | listening | processing | done
  const [pulseAnim]                   = useState(new Animated.Value(1));

  useEffect(() => {
    return () => {
      Speech.stop();
      stopPulse();
    };
  }, []);

  // Pulse animation for mic button while listening
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // Simulate voice input — in production this uses expo-av / speech recognition
  // For Expo Go we simulate with preset phrases for testing
  const startListening = async () => {
    setListening(true);
    setStatus('listening');
    setTranscript('');
    setResults([]);
    startPulse();

    // Simulate listening for 3 seconds then processing
    setTimeout(async () => {
      stopPulse();
      setListening(false);
      setStatus('processing');

      // Simulated transcript — replace with real speech recognition output
      const simulatedTranscript = 'someone is not breathing and has no pulse';
      setTranscript(simulatedTranscript);

      setLoading(true);
      try {
        const data = await searchScenarios(simulatedTranscript);
        setResults(data);
      } catch (e) {
        console.error('Voice search failed:', e);
      } finally {
        setLoading(false);
        setStatus('done');
      }
    }, 3000);
  };

  const reset = () => {
    Speech.stop();
    setListening(false);
    setTranscript('');
    setResults([]);
    setStatus('idle');
    stopPulse();
  };

  const getUrgencyColor = (level) => {
    switch (level) {
      case 'red':   return colors.urgencyRed;
      case 'amber': return colors.urgencyAmber;
      case 'green': return colors.urgencyGreen;
      default:      return colors.primary;
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.dark} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Voice Input</Text>
        <Text style={styles.headerSub}>Describe the emergency out loud</Text>
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

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Mic button */}
        <View style={styles.micSection}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.micBtn,
                listening && styles.micBtnActive,
              ]}
              onPress={listening ? reset : startListening}
              activeOpacity={0.85}
              disabled={status === 'processing'}
            >
              <Ionicons
                name={listening ? 'stop' : 'mic'}
                size={48}
                color={colors.white}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Status text */}
          <Text style={styles.statusText}>
            {status === 'idle'       && 'Tap the mic and describe the emergency'}
            {status === 'listening'  && 'Listening... speak now'}
            {status === 'processing' && 'Finding matching guidance...'}
            {status === 'done'       && 'Here is what I found'}
          </Text>

          {/* Reset button */}
          {status !== 'idle' && (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={reset}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={styles.resetText}>  Start over</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Transcript box */}
        {transcript.length > 0 && (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>
              <Ionicons name="mic-outline" size={13} /> You said:
            </Text>
            <Text style={styles.transcriptText}>"{transcript}"</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 24 }}
          />
        )}

        {/* Results */}
        {results.length > 0 && (
          <>
            <Text style={styles.resultsLabel}>Matching scenarios:</Text>
            {results.map((item) => {
              const urgencyColor = getUrgencyColor(item.urgency_level);
              return (
                <TouchableOpacity
                  key={item.scenario_id}
                  style={styles.card}
                  onPress={() =>
                    navigation.navigate('HomeTab', {
                      screen: 'Scenario',
                      params: { scenarioId: item.scenario_id },
                    })
                  }
                  activeOpacity={0.75}
                >
                  <View style={[styles.urgencyBar, { backgroundColor: urgencyColor }]} />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSummary} numberOfLines={2}>
                      {item.summary}
                    </Text>
                    <View style={styles.cardFooter}>
                      <View style={[styles.badge, { backgroundColor: urgencyColor + '22' }]}>
                        <Text style={[styles.badgeText, { color: urgencyColor }]}>
                          {item.urgency_level?.toUpperCase()}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textLight}
                        style={{ marginLeft: 'auto' }}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* No results */}
        {status === 'done' && results.length === 0 && (
          <View style={styles.noResults}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.textLight} />
            <Text style={styles.noResultsText}>
              No matching scenario found. Try the Search tab or call 999.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scroll: {
    padding: layout.spacing.md,
    alignItems: 'center',
  },
  micSection: {
    alignItems: 'center',
    paddingVertical: layout.spacing.xl,
    gap: layout.spacing.md,
  },
  micBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...layout.shadowStrong,
  },
  micBtnActive: {
    backgroundColor: colors.urgencyRed,
  },
  statusText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: layout.spacing.xl,
    lineHeight: 22,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: layout.spacing.md,
    borderRadius: layout.radius.round,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  resetText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  transcriptBox: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: layout.spacing.md,
  },
  transcriptLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  transcriptText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  resultsLabel: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: layout.spacing.sm,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: layout.radius.md,
    marginBottom: layout.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
    ...layout.shadow,
  },
  urgencyBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: layout.spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardSummary: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: layout.spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: layout.radius.round,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  noResults: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 24,
    paddingHorizontal: layout.spacing.xl,
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
});