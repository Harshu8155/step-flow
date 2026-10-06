// Design tokens.
//
// Redesign: the previous "pastel AI" direction (pink -> lilac -> aqua aurora
// behind glassmorphic cards) is replaced by a flat, high-contrast system —
// a light grey ground, solid white cards, near-black type, and exactly ONE
// accent (warm orange). The old palette spent four hues on decoration, which
// left nothing to signal state; here orange is reserved for progress, the
// active tab, and calls to action, so it always means something.
//
// Token NAMES are unchanged so every existing screen restyles without edits.
// A few now carry different jobs, noted inline.

// The single accent. Everything else is neutral.
const ORANGE = '#E8552B';
const INK = '#17171A';

export const lightColors = {
  // Flat ground. `gradStops` is empty on purpose: GradientBackground renders
  // radial "aurora" blobs from it, and this design wants a plain surface.
  grad: ['#EFEEEC', '#EDECEA'],
  gradStops: [],

  // Card surfaces. Kept under the old glass* names — they now describe a
  // solid card and its hairline edge rather than a translucent pane.
  glass: '#FFFFFF',
  glassBrd: 'rgba(0,0,0,0.05)',
  glassIn: '#F5F4F2',

  bg: '#EFEEEC',
  surface: '#FFFFFF',
  surface2: '#E7E5E2',   // chart tracks, inactive fills
  surfaceHover: '#DEDCD8',

  primary: ORANGE,
  primaryLight: '#F2794E',
  primaryDark: '#C8431F',

  // `accent` is the chart's second colour. Near-black, not a third hue —
  // this is what makes the rings read as orange-on-black like the reference.
  accent: INK,
  accentDark: '#000000',

  calories: ORANGE,
  goal: INK,
  success: '#1F9D62',
  danger: '#D93A2B',

  text: INK,
  textSecondary: '#4A4A4F',
  muted: '#8A8A90',
  mutedDark: '#B4B4B9',

  border: '#E4E2DF',
  borderLight: '#EDEBE8',

  warnBg: '#FDECE7',
  successBg: '#E7F4EE',
  primaryTint: '#FCEAE3',

  // Floating tab bar: a dark pill on the light ground.
  tabBar: '#1C1C1E',
  tabBarActive: '#FFFFFF',
  tabBarActiveText: '#17171A',
  tabBarIdle: '#8E8E93',
  // Accent as RGB components, for alpha ramps (heatmap intensity) that a hex
  // token can't express. Keep in sync with `primary`.
  primaryRgb: '232, 85, 43',
  onAccent: '#FFFFFF',
  onInk: '#FFFFFF',
};

export const darkColors = {
  grad: ['#0E0E10', '#111113'],
  gradStops: [],

  glass: '#1A1A1D',
  glassBrd: 'rgba(255,255,255,0.07)',
  glassIn: '#242428',

  bg: '#0E0E10',
  surface: '#1A1A1D',
  surface2: '#26262A',
  surfaceHover: '#303036',

  primary: '#F26538',
  primaryLight: '#FF8159',
  primaryDark: '#C8431F',

  // Inverted from light: on a dark ground the "ink" role is a bright neutral.
  accent: '#F2F2F5',
  accentDark: '#FFFFFF',

  calories: '#F26538',
  goal: '#F2F2F5',
  success: '#35C88A',
  danger: '#F2564A',

  text: '#F4F4F6',
  textSecondary: '#C2C2C8',
  muted: '#88888F',
  mutedDark: '#5C5C63',

  border: '#2A2A2F',
  borderLight: '#35353B',

  warnBg: '#2E1A16',
  successBg: '#12251C',
  primaryTint: '#331A11',

  tabBar: '#F2F2F5',
  tabBarActive: '#1C1C1E',
  tabBarActiveText: '#F4F4F6',
  tabBarIdle: '#6E6E76',
  primaryRgb: '242, 101, 56',
  onAccent: '#FFFFFF',
  onInk: '#1C1C1E',
};

export const themes = {
  dark: darkColors,
  light: lightColors,
};

// Backward-compatible static alias (light is the primary theme).
export const colors = lightColors;

export const TAB_BAR_CLEARANCE = 96;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Rounder than before — this design leans on pill and squircle geometry.
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
};

// Font-family tokens. Loaded by src/theme/fonts.js (expo-font).
export const fonts = {
  // display / big numbers
  display: 'Sora_700Bold',
  displayExtra: 'Sora_800ExtraBold',
  displaySemi: 'Sora_600SemiBold',
  // body / UI text
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
};

// Type scale. The reference leans on one very large, tightly-tracked headline
// against small quiet labels; centralising it keeps that contrast consistent
// instead of every screen picking its own sizes.
export const type = {
  hero: { fontFamily: fonts.displayExtra, fontSize: 34, lineHeight: 38, letterSpacing: -1.2 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, letterSpacing: -0.6 },
  section: { fontFamily: fonts.semibold, fontSize: 16, letterSpacing: -0.2 },
  stat: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.8 },
  body: { fontFamily: fonts.regular, fontSize: 13 },
  label: { fontFamily: fonts.medium, fontSize: 11 },
};

// Shadows are soft and neutral now — a warm purple glow read as decoration.
export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 20,
  },
};
