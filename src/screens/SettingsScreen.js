// src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, updateSettings } from '../database/db';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';

export default function SettingsScreen({ navigation }) {
  const [language, setLanguage]     = useState('en');
  const [ttsEnabled, setTtsEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await getSettings();
      if (s) {
        setLanguage(s.language);
        setTtsEnabled(s.tts_enabled === 1);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const toggleLanguage = async (lang) => {
    setLanguage(lang);
    await updateSettings(lang, ttsEnabled);
  };

  const toggleTTS = async (value) => {
    setTtsEnabled(value);
    await updateSettings(language, value);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.dark} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSub}>Customise your AidField experience</Text>
      </View>

      {/* Emergency banner */}
      <TouchableOpacity
        style={styles.emergencyBanner}
        onPress={() => navigation.navigate('Emergency')}
        activeOpacity={0.85}
      >
        <Ionicons name="call" size={16} color={colors.white} />
        <Text style={styles.emergencyText}>  Emergency Call — 999 / 112</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* Emergency contacts shortcut */}
        <TouchableOpacity
          style={styles.emergencyCard}
          onPress={() => navigation.navigate('Emergency')}
          activeOpacity={0.8}
        >
          <View style={styles.emergencyCardLeft}>
            <Ionicons name="call" size={28} color={colors.white} />
          </View>
          <View style={styles.emergencyCardText}>
            <Text style={styles.emergencyCardTitle}>Emergency Contacts</Text>
            <Text style={styles.emergencyCardSub}>
              One-tap dial: 999, 112, Kenya Red Cross
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.urgencyRed} />
        </TouchableOpacity>

        {/* Language */}
        <Text style={styles.sectionLabel}>LANGUAGE</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="language" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>  Display Language</Text>
          </View>
          <Text style={styles.cardSub}>
            Choose the language for step-by-step instructions
          </Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[
                styles.langBtn,
                language === 'en' && styles.langBtnActive,
              ]}
              onPress={() => toggleLanguage('en')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.langBtnText,
                language === 'en' && styles.langBtnTextActive,
              ]}>
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.langBtn,
                language === 'sw' && styles.langBtnActive,
              ]}
              onPress={() => toggleLanguage('sw')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.langBtnText,
                language === 'sw' && styles.langBtnTextActive,
              ]}>
                Kiswahili
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TTS */}
        <Text style={styles.sectionLabel}>AUDIO</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high" size={20} color={colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.cardTitle}>  Read Steps Aloud</Text>
                <Text style={styles.cardSub}>
                  {'  '}Auto-read instructions using text-to-speech
                </Text>
              </View>
            </View>
            <Switch
              value={ttsEnabled}
              onValueChange={toggleTTS}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={ttsEnabled ? colors.primary : colors.textLight}
            />
          </View>
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          {[
            { icon: 'shield-checkmark', label: 'Version',   value: '1.0.0' },
            { icon: 'location',         label: 'Region',    value: 'Kenya' },
            { icon: 'library',          label: 'Scenarios', value: '50 offline guides' },
            { icon: 'wifi',             label: 'AI Tier',   value: 'Anthropic Claude API' },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <View style={styles.aboutRow}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
                <Text style={styles.aboutLabel}>  {item.label}</Text>
                <Text style={styles.aboutValue}>{item.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.disclaimerText}>
            {'  '}AidField provides first aid guidance only. It is not a substitute
            for professional medical care. Always call emergency services in
            life-threatening situations.
          </Text>
        </View>

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
  },
  emergencyCard: {
    backgroundColor: colors.urgencyRed,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: layout.spacing.lg,
    ...layout.shadowStrong,
  },
  emergencyCardLeft: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: layout.spacing.md,
  },
  emergencyCardText: {
    flex: 1,
  },
  emergencyCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  emergencyCardSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
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
    padding: layout.spacing.md,
    marginBottom: layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...layout.shadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: layout.spacing.md,
    lineHeight: 18,
  },
  langRow: {
    flexDirection: 'row',
    gap: layout.spacing.sm,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: layout.radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  langBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  langBtnTextActive: {
    color: colors.primary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  aboutLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  aboutValue: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: layout.spacing.sm,
  },
  disclaimerText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
});