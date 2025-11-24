/**
 * Centralized Typography System
 * 
 * Change fonts, sizes, weights, and styles for the entire app in one place!
 * 
 * To change the font family:
 * - Update FONT_FAMILY object below
 * - Make sure to load the fonts in app/_layout.tsx
 */

// ========================================
// FONT FAMILY CONFIGURATION
// ========================================
// Change these to switch font families globally
export const FONT_FAMILY = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
};

// Alternative font families (uncomment to use):
// For System Default:
// export const FONT_FAMILY = {
//   regular: 'System',
//   medium: 'System',
//   semiBold: 'System',
//   bold: 'System',
// };

// For Roboto (if you want to switch):
// export const FONT_FAMILY = {
//   regular: 'Roboto-Regular',
//   medium: 'Roboto-Medium',
//   semiBold: 'Roboto-Bold',
//   bold: 'Roboto-Bold',
// };

// ========================================
// FONT SIZES
// ========================================
export const FONT_SIZES = {
  // Headings
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
  
  // Body text
  body: 16,
  bodySmall: 14,
  
  // UI elements
  button: 14,
  input: 16,
  caption: 12,
  label: 14,
  
  // Special
  tiny: 10,
  large: 18,
  xlarge: 20,
};

// ========================================
// LINE HEIGHTS
// ========================================
export const LINE_HEIGHTS = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
};

// ========================================
// PREDEFINED TEXT STYLES
// ========================================
// Use these for common text patterns in your app
export const TEXT_STYLES = {
  // Headings
  h1: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZES.h1,
    lineHeight: FONT_SIZES.h1 * LINE_HEIGHTS.tight,
  },
  h2: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZES.h2,
    lineHeight: FONT_SIZES.h2 * LINE_HEIGHTS.tight,
  },
  h3: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZES.h3,
    lineHeight: FONT_SIZES.h3 * LINE_HEIGHTS.normal,
  },
  h4: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZES.h4,
    lineHeight: FONT_SIZES.h4 * LINE_HEIGHTS.normal,
  },
  h5: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: FONT_SIZES.h5,
    lineHeight: FONT_SIZES.h5 * LINE_HEIGHTS.normal,
  },
  h6: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: FONT_SIZES.h6,
    lineHeight: FONT_SIZES.h6 * LINE_HEIGHTS.normal,
  },
  
  // Body text
  body: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * LINE_HEIGHTS.normal,
  },
  bodyMedium: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * LINE_HEIGHTS.normal,
  },
  bodyBold: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * LINE_HEIGHTS.normal,
  },
  bodySmall: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZES.bodySmall,
    lineHeight: FONT_SIZES.bodySmall * LINE_HEIGHTS.normal,
  },
  bodySmallMedium: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZES.bodySmall,
    lineHeight: FONT_SIZES.bodySmall * LINE_HEIGHTS.normal,
  },
  
  // UI Elements
  button: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZES.button,
    lineHeight: FONT_SIZES.button * LINE_HEIGHTS.normal,
  },
  buttonMedium: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZES.button,
    lineHeight: FONT_SIZES.button * LINE_HEIGHTS.normal,
  },
  input: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZES.input,
    lineHeight: FONT_SIZES.input * LINE_HEIGHTS.normal,
  },
  label: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZES.label,
    lineHeight: FONT_SIZES.label * LINE_HEIGHTS.normal,
  },
  caption: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZES.caption,
    lineHeight: FONT_SIZES.caption * LINE_HEIGHTS.normal,
  },
  
  // Card text
  cardTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * LINE_HEIGHTS.tight,
  },
  cardSubtitle: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZES.bodySmall,
    lineHeight: FONT_SIZES.bodySmall * LINE_HEIGHTS.normal,
  },
  cardBody: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZES.bodySmall,
    lineHeight: FONT_SIZES.bodySmall * LINE_HEIGHTS.normal,
  },
  
  // Special
  error: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZES.caption,
    lineHeight: FONT_SIZES.caption * LINE_HEIGHTS.normal,
  },
  link: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZES.body,
    lineHeight: FONT_SIZES.body * LINE_HEIGHTS.normal,
  },
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Create a custom text style with specified properties
 * @param fontSize - Font size in pixels
 * @param fontFamily - Font family ('regular', 'medium', 'semiBold', 'bold')
 * @param lineHeight - Optional line height multiplier
 */
export const createTextStyle = (
  fontSize: number,
  fontFamily: keyof typeof FONT_FAMILY = 'regular',
  lineHeight: number = LINE_HEIGHTS.normal
) => ({
  fontFamily: FONT_FAMILY[fontFamily],
  fontSize,
  lineHeight: fontSize * lineHeight,
});

/**
 * Get font family by weight
 * Use this when you need just the font family
 */
export const getFontFamily = (weight: keyof typeof FONT_FAMILY = 'regular') => {
  return FONT_FAMILY[weight];
};

