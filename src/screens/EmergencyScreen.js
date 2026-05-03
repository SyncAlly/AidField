// src/screens/EmergencyScreen.js
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ScrollView, Linking, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';

const EMERGENCY_CONTACTS = [
  {
    id: 1,
    name: 'Police & Ambulance',
    number: '999',
    description: 'Kenya national emergency number',
    icon: 'shield',
    color: colors.urgencyRed,
  },
  {
    id: 2,
    name: 'Emergency Services',
    number: '112',
    description: 'Works even without airtime or signal',
    icon: 'call',
    color: colors.urgencyRed,
  },
  {
    id: 3,
    name: 'Kenya Red Cross',
    number: '0800723999',
    description: 'Free 24/7 emergency helpline',
    icon: 'medkit',
    color: '#C0392B',
  },
  {
    id: 4,
    name: 'Nairobi Hospital',
    number: '0730017000',
    description: 'Nairobi — 24hr emergency',
    icon: 'business',
    color: colors.urgencyAmber,
  },
  {
    id: 5,
    name: 'Kenyatta National Hospital',
    number: '0722204488',
    description: 'Nairobi — public referral hospital',
    icon: 'business',
    color: colors.urgencyAmber,
  },
  {
    id: 6,
    name: 'Aga Khan Hospital',
    number: '0366200000',
    description: 'Nairobi — 24hr emergency',
    icon: 'business',
    color: colors.urgencyAmber,
  },
  {
    id: 7,
    name: 'St John Ambulance Kenya',
    number: '0721225285',
    description: 'Ambulance & first aid services',
    icon: 'car',
    color: colors.primary,
  },
  {
    id: 8,
    name: 'Poison Control',
    number: '0800721210',
    description: 'Kenyatta National Hospital poison helpline',
    icon: 'skull',
    color: colors.urgencyAmber,
  },
];

export default function EmergencyScreen({ navigation }) {

  const handleCall = (contact) => {
    Alert.alert(
      `Call ${contact.name}?`,
      `You are about to call ${contact.number}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Call ${contact.number}`,
          style: 'destructive',
          onPress: () => Linking.openURL(`tel:${contact.number}`),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.urgencyRed} />

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
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <Text style={styles.headerSub}>Tap any contact to call immediately</Text>
        </View>
      </View>

      {/* Top 2 priority contacts */}
      <View style={styles.priorityRow}>
        {EMERGENCY_CONTACTS.slice(0, 2).map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={styles.priorityBtn}
            onPress={() => handleCall(contact)}
            activeOpacity={0.8}
          >
            <Ionicons name={contact.icon} size={28} color={colors.white} />
            <Text style={styles.priorityNumber}>{contact.number}</Text>
            <Text style={styles.priorityName}>{contact.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={16} color={colors.urgencyAmber} />
          <Text style={styles.disclaimerText}>
            {'  '}112 works even without airtime or a SIM card on any network.
          </Text>
        </View>

        {/* All other contacts */}
        <Text style={styles.sectionLabel}>ALL EMERGENCY CONTACTS</Text>
        {EMERGENCY_CONTACTS.map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={styles.card}
            onPress={() => handleCall(contact)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: contact.color + '22' }]}>
              <Ionicons name={contact.icon} size={22} color={contact.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardName}>{contact.name}</Text>
              <Text style={styles.cardDesc}>{contact.description}</Text>
            </View>
            <View style={styles.callBtn}>
              <Text style={styles.callNumber}>{contact.number}</Text>
              <Ionicons name="call" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>
        ))}

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
    backgroundColor: colors.urgencyRed,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  priorityRow: {
    flexDirection: 'row',
    backgroundColor: colors.urgencyRed,
    paddingHorizontal: layout.spacing.md,
    paddingBottom: layout.spacing.lg,
    gap: layout.spacing.sm,
  },
  priorityBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  priorityNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 1,
  },
  priorityName: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  scroll: {
    padding: layout.spacing.md,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.urgencyAmber + '18',
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    marginBottom: layout.spacing.md,
    borderWidth: 1,
    borderColor: colors.urgencyAmber + '44',
  },
  disclaimerText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: layout.spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    marginBottom: layout.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...layout.shadow,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: layout.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: layout.spacing.md,
  },
  cardText: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callBtn: {
    backgroundColor: colors.urgencyRed,
    borderRadius: layout.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 3,
    minWidth: 70,
  },
  callNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
});