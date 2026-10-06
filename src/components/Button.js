// Button — the app's only button.
//
// It replaces ten ad-hoc button styles that had drifted apart: four different
// corner radii, five different fills, and text set with `fontWeight` instead of
// a font-family token. That last one is why they read as stock Android — on
// Android `fontWeight` cannot select a weight inside a loaded custom family, so
// those labels silently fell back to Roboto while the rest of the app rendered
// in Plus Jakarta Sans. Everything here goes through `fonts.*`.
//
// Variants:
//   primary   filled orange — the one main action on a screen
//   secondary filled ink — a strong action that isn't THE action
//   ghost     outlined, transparent — pairs with primary (Cancel next to Save)
//   subtle    sunken grey fill, no border — low-emphasis / tertiary
//   danger    outlined red — destructive
//   onAccent  white fill, for sitting on an orange surface
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import PressableScale from './PressableScale';
import LineIcon from './LineIcon';
import Loader from './Loader';
import { radius, spacing, fonts, shadows } from '../theme';
import { useTheme } from '../theme/ThemeContext';

const SIZES = {
  sm: { height: 38, px: spacing.lg, font: 13, icon: 16, gap: 6 },
  md: { height: 48, px: spacing.xl, font: 15, icon: 18, gap: 8 },
  lg: { height: 56, px: spacing.xl, font: 16, icon: 20, gap: 9 },
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,            // LineIcon name, rendered before the label
  iconRight,
  loading = false,
  disabled = false,
  full = false,    // stretch to the container width
  haptic,
  style,
  textStyle,
}) {
  const { colors } = useTheme();
  const s = SIZES[size] || SIZES.md;

  const VARIANTS = useMemo(() => ({
    primary: { bg: colors.primary, fg: colors.onAccent, border: 'transparent', lift: true },
    secondary: { bg: colors.accent, fg: colors.onInk, border: 'transparent', lift: true },
    ghost: { bg: 'transparent', fg: colors.text, border: colors.border, lift: false },
    subtle: { bg: colors.glassIn, fg: colors.text, border: 'transparent', lift: false },
    danger: { bg: 'transparent', fg: colors.danger, border: colors.danger, lift: false },
    onAccent: { bg: colors.onAccent, fg: colors.primary, border: 'transparent', lift: false },
  }), [colors]);

  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;

  // Default the feedback to the weight of the action rather than making every
  // call site think about it.
  const feedback = haptic !== undefined
    ? haptic
    : variant === 'primary' || variant === 'secondary' ? 'medium' : 'light';

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      haptic={feedback}
      scale={0.97}
      containerStyle={[full && styles.full, style]}
      style={[
        styles.btn,
        {
          height: s.height,
          paddingHorizontal: s.px,
          backgroundColor: v.bg,
          borderColor: v.border,
        },
        // A shadow under a transparent button would draw a visible plate, so it
        // is only applied to the filled variants.
        v.lift && !isDisabled && shadows.card,
        isDisabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <Loader size={s.icon + 4} color={v.fg} bars={false} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <LineIcon name={icon} size={s.icon} color={v.fg} strokeWidth={1.9} />
          ) : null}
          <AppText
            weight="semibold"
            numberOfLines={1}
            style={[
              styles.label,
              {
                fontSize: s.font,
                color: v.fg,
                marginLeft: icon ? s.gap : 0,
                marginRight: iconRight ? s.gap : 0,
              },
              textStyle,
            ]}
          >
            {label}
          </AppText>
          {iconRight ? (
            <LineIcon name={iconRight} size={s.icon} color={v.fg} strokeWidth={1.9} />
          ) : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Pill geometry, matching the tab bar and segmented control.
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontFamily: fonts.semibold, letterSpacing: -0.2 },
  disabled: { opacity: 0.45 },
});
