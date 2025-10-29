/**
 * Golden Ratio Spacing System
 *
 * Uses the golden ratio (1.618) for harmonic spacing throughout the app
 * Base unit: 8px (common mobile design standard)
 */

const GOLDEN_RATIO = 1.618;
const BASE = 8;

/**
 * Phi-based spacing scale
 * Each level multiplies by phi for harmonious proportions
 */
export const spacing = {
  /** 5px - Minimal gap between related elements */
  xs: Math.round(BASE * GOLDEN_RATIO ** -2),

  /** 8px - Base unit, tight spacing */
  sm: BASE,

  /** 13px - Comfortable spacing between elements */
  md: Math.round(BASE * GOLDEN_RATIO),

  /** 21px - Section spacing */
  lg: Math.round(BASE * GOLDEN_RATIO ** 2),

  /** 34px - Major section divisions */
  xl: Math.round(BASE * GOLDEN_RATIO ** 3),

  /** 55px - Page-level spacing */
  xxl: Math.round(BASE * GOLDEN_RATIO ** 4),
} as const;

/**
 * Card spacing - consistent padding for all cards
 */
export const cardSpacing = {
  padding: spacing.md, // 13px
  gap: spacing.lg, // 21px between cards
} as const;

/**
 * Screen spacing - consistent margins for screens
 */
export const screenSpacing = {
  horizontal: spacing.md, // 13px horizontal padding
  vertical: spacing.lg, // 21px vertical spacing
  sectionGap: spacing.xl, // 34px between major sections
} as const;

export default spacing;
