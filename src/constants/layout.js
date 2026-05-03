// src/constants/layout.js
import { Dimensions, StyleSheet } from 'react-native';
import { colors } from './colors';

const { width, height } = Dimensions.get('window');

export const layout = {
  // Screen dimensions
  screenWidth: width,
  screenHeight: height,

  // Spacing scale
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Border radius
  radius: {
    sm: 6,
    md: 12,
    lg: 18,
    xl: 28,
    round: 999,
  },

  // Card shadow (Android + iOS)
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  shadowStrong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },

  // Header height
  headerHeight: 56,

  // Tab bar height
  tabBarHeight: 64,

  // Bottom safe area padding
  bottomPadding: 16,
};

// Reusable common styles
export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    marginHorizontal: layout.spacing.md,
    marginVertical: layout.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...layout.shadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: layout.spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: layout.spacing.md,
    paddingTop: layout.spacing.lg,
    paddingBottom: layout.spacing.sm,
  },
});