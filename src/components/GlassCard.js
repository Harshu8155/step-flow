// Card — the app's standard surface.
//
// Still exported as GlassCard so the ~40 existing call sites keep working, but
// it is no longer glass: the redesign puts SOLID cards on a flat grey ground,
// which is what gives the layout its crispness. A translucent pane over a flat
// background just looks like a lighter flat background.
//
// The old file dropped shadows entirely because Android draws an opaque backing
// behind an elevated view with a semi-transparent background, which showed as a
// grey rectangle inside the glass. Now that the card is fully opaque that
// conflict is gone, so the soft lift is back — it's what separates the card
// from the ground here.
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows } from '../theme';

export default function GlassCard({
  children,
  style,
  radius: r = radius.lg,
  padding = 18,
  tone = 'surface',  // 'surface' | 'sunken' | 'ink' | 'accent'
  flat,              // drop the shadow (for cards nested inside another card)
  intensity,         // unused, kept for call-site compatibility
  flex,              // unused, kept for call-site compatibility
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const TONES = {
    surface: { backgroundColor: colors.glass, borderColor: colors.glassBrd },
    sunken: { backgroundColor: colors.glassIn, borderColor: 'transparent' },
    ink: { backgroundColor: colors.accent, borderColor: 'transparent' },
    accent: { backgroundColor: colors.primary, borderColor: 'transparent' },
  };

  return (
    <View
      style={[
        styles.card,
        TONES[tone] || TONES.surface,
        { borderRadius: r, padding },
        !flat && tone === 'surface' && shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
});
