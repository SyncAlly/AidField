// src/constants/typography.js
import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const typography = StyleSheet.create({
  // Headings
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  h2: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  h4: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Body
  body: {
    fontSize: 15,
    fontWeight: 'normal',
    color: colors.textPrimary,
    lineHeight: 23,
  },
  bodyLarge: {
    fontSize: 17,
    fontWeight: 'normal',
    color: colors.textPrimary,
    lineHeight: 26,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: 'normal',
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Labels
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: 11,
    fontWeight: 'normal',
    color: colors.textLight,
    lineHeight: 16,
  },

  // Special
  stepNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textOnDark,
    lineHeight: 28,
  },
});
