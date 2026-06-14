// src/screens/ScenarioScreen.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import {
  getScenarioById,
  getStepsByScenario,
  getResourcesByScenario,
  getSettings,
} from '../database/db';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';

export default function ScenarioScreen({ navigation, route }) {
  const { scenarioId } = route.params;
  const [scenario, setScenario]     = useState(null);
  const [steps, setSteps]           = useState([]);
  const [resources, setResources]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [speaking, setSpeaking]     = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const stopRequested               = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSwahili, setShowSwahili] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [swVoice, setSwVoice]         = useState(null);
  const [enVoice, setEnVoice]         = useState(null);

  useEffect(() => {
    loadData();
    fetchVoices();
    return () => {
      Speech.stop();
      stopRequested.current = true;
    };
  }, []);

  const fetchVoices = async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      if (voices && voices.length > 0) {
        // Find the best available Swahili voice (prefers Enhanced/KE/TZ)
        const swVoices = voices.filter(v => v.language && v.language.toLowerCase().startsWith('sw'));
        if (swVoices.length > 0) {
          const bestSw = swVoices.find(v => v.quality?.toLowerCase() === 'enhanced') ||
                         swVoices.find(v => v.language.toLowerCase().includes('ke')) ||
                         swVoices.find(v => v.language.toLowerCase().includes('tz')) ||
                         swVoices[0];
          setSwVoice(bestSw.identifier);
        }

        // Find the best available English voice
        const enVoices = voices.filter(v => v.language && v.language.toLowerCase().startsWith('en'));
        if (enVoices.length > 0) {
          const bestEn = enVoices.find(v => v.quality?.toLowerCase() === 'enhanced') ||
                         enVoices.find(v => v.language.toLowerCase() === 'en-us') ||
                         enVoices.find(v => v.language.toLowerCase() === 'en-gb') ||
                         enVoices[0];
          setEnVoice(bestEn.identifier);
        }
      }
    } catch (e) {
      console.warn('Could not query system voices:', e);
    }
  };

  useEffect(() => {
    if (ttsEnabled && steps.length > 0 && scenario && !loading) {
      speakSteps();
    }
  }, [ttsEnabled, steps, scenario, loading]);

  const loadData = async () => {
    try {
      const [s, st, r, settings] = await Promise.all([
        getScenarioById(scenarioId),
        getStepsByScenario(scenarioId),
        getResourcesByScenario(scenarioId),
        getSettings(),
      ]);
      setScenario(s);
      setSteps(st);
      setResources(r);
      if (settings?.tts_enabled === 1) {
        setTtsEnabled(true);
      }
      if (settings?.language === 'sw') {
        setShowSwahili(true);
      }
    } catch (e) {
      console.error('Failed to load scenario:', e);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (level) => {
    switch (level) {
      case 'red':   return colors.urgencyRed;
      case 'amber': return colors.urgencyAmber;
      case 'green': return colors.urgencyGreen;
      default:      return colors.primary;
    }
  };

  // Read all steps aloud one by one
  const speakSteps = async () => {
    if (speaking) {
      stopRequested.current = true;
      Speech.stop();
      setSpeaking(false);
      setCurrentStep(0);
      return;
    }

    stopRequested.current = false;
    setSpeaking(true);

    const allSteps = steps;

    for (let i = 0; i < allSteps.length; i++) {
      if (stopRequested.current) break;

      setCurrentStep(i);

      const text = showSwahili && allSteps[i].instruction_sw
        ? allSteps[i].instruction_sw
        : allSteps[i].instruction;

      let prefix;
      if (showSwahili) {
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
        prefix = `Hatua ya ${ordinal}. `;
      } else {
        prefix = `Step ${i + 1}. `;
      }

      await new Promise((resolve) => {
        const options = {
          language: showSwahili ? 'sw' : 'en',
          rate: showSwahili ? 0.82 : 0.85, // Slower Swahili speech is much easier to digest in emergencies
          pitch: 1.0,
          onDone: resolve,
          onError: resolve,
          onStopped: resolve,
        };

        if (showSwahili && swVoice) {
          options.voice = swVoice;
        } else if (!showSwahili && enVoice) {
          options.voice = enVoice;
        }

        Speech.speak(`${prefix}${text}`, options);
      });
    }

    setSpeaking(false);
    setCurrentStep(0);
    stopRequested.current = false;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const urgencyColor = getUrgencyColor(scenario?.urgency_level);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.dark} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { Speech.stop(); navigation.goBack(); }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {scenario?.title}
        </Text>
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
        {/* Urgency + summary card */}
        <View style={[styles.summaryCard, { borderLeftColor: urgencyColor }]}>
          <View style={styles.summaryTop}>
            <Ionicons name="warning" size={18} color={urgencyColor} />
            <Text style={[styles.urgencyLabel, { color: urgencyColor }]}>
              {'  '}{scenario?.urgency_level?.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.summaryText}>{scenario?.summary}</Text>
        </View>

        {/* Controls row */}
        <View style={styles.controls}>
          {/* TTS button */}
          <TouchableOpacity
            style={[styles.controlBtn, speaking && styles.controlBtnActive]}
            onPress={speakSteps}
            activeOpacity={0.8}
          >
            <Ionicons
              name={speaking ? 'stop-circle' : 'volume-high'}
              size={18}
              color={speaking ? colors.white : colors.primary}
            />
            <Text style={[styles.controlBtnText, speaking && { color: colors.white }]}>
              {speaking ? ' Stop' : ' Read Aloud'}
            </Text>
          </TouchableOpacity>

          {/* Language toggle */}
          <TouchableOpacity
            style={[styles.controlBtn, showSwahili && styles.controlBtnActive]}
            onPress={() => setShowSwahili(!showSwahili)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="language"
              size={18}
              color={showSwahili ? colors.white : colors.primary}
            />
            <Text style={[styles.controlBtnText, showSwahili && { color: colors.white }]}>
              {showSwahili ? ' Swahili' : ' English'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Steps */}
        <Text style={styles.sectionTitle}>Steps</Text>
        {steps.map((step, index) => {
          const isActive = speaking && currentStep === index;
          const instruction = showSwahili && step.instruction_sw
            ? step.instruction_sw
            : step.instruction;
          return (
            <View
              key={step.step_id}
              style={[styles.stepCard, isActive && styles.stepCardActive]}
            >
              <View style={[styles.stepNumber, { backgroundColor: urgencyColor }]}>
                <Text style={styles.stepNumberText}>{step.step_number}</Text>
              </View>
              <Text style={styles.stepText}>{instruction}</Text>
            </View>
          );
        })}

        {/* Improvised Resources */}
        {resources.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.resourcesHeader}
              onPress={() => setShowResources(!showResources)}
              activeOpacity={0.8}
            >
              <Ionicons name="construct-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>  Improvised Resources</Text>
              <Ionicons
                name={showResources ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
                style={{ marginLeft: 'auto' }}
              />
            </TouchableOpacity>

            {showResources && resources.map((r) => (
              <View key={r.resource_id} style={styles.resourceCard}>
                <Text style={styles.resourceItem}>
                  <Text style={styles.resourceLabel}>Standard: </Text>
                  {r.standard_item}
                </Text>
                <Text style={styles.resourceItem}>
                  <Text style={styles.resourceLabel}>Substitute: </Text>
                  {r.substitutes}
                </Text>
                {r.notes && (
                  <Text style={styles.resourceNote}>💡 {r.notes}</Text>
                )}
              </View>
            ))}
          </>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    flex: 1,
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
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    borderLeftWidth: 4,
    marginBottom: layout.spacing.md,
    ...layout.shadow,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: layout.spacing.sm,
  },
  urgencyLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  summaryText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  controls: {
    flexDirection: 'row',
    gap: layout.spacing.sm,
    marginBottom: layout.spacing.md,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: layout.radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  controlBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  controlBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: layout.spacing.sm,
  },
  stepCard: {
    backgroundColor: colors.card,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    marginBottom: layout.spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    ...layout.shadow,
  },
  stepCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryLight,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: layout.spacing.md,
    marginTop: 1,
  },
  stepNumberText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  resourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: layout.spacing.md,
    marginBottom: layout.spacing.sm,
  },
  resourceCard: {
    backgroundColor: colors.card,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    marginBottom: layout.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  resourceItem: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  resourceLabel: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  resourceNote: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});