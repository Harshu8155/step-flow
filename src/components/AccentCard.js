// AccentCard — the full-orange tip card with a dismiss / confirm pair.
//
// This is the one place the accent covers a whole surface, which is what gives
// it weight: if orange were used for several cards at once none of them would
// read as the thing to look at. Use it for a single, dismissible prompt.
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import PressableScale from './PressableScale';
import { radius, spacing, fonts, shadows } from '../theme';
import { useTheme } from '../theme/ThemeContext';

export default function AccentCard({
  message,
  dismissLabel = 'Dismiss',
  confirmLabel,
  onDismiss,
  onConfirm,
  style,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.card, style]}>
      <AppText weight="semibold" style={styles.message}>{message}</AppText>
      <View style={styles.actions}>
        {onDismiss && (
          <PressableScale
            onPress={onDismiss}
            haptic="light"
            containerStyle={styles.btnWrap}
            style={[styles.btn, styles.btnGhost]}
          >
            <AppText weight="semibold" style={styles.btnGhostText}>{dismissLabel}</AppText>
          </PressableScale>
        )}
        {onConfirm && confirmLabel && (
          <PressableScale
            onPress={onConfirm}
            haptic="medium"
            containerStyle={styles.btnWrap}
            style={[styles.btn, styles.btnSolid]}
          >
            <AppText weight="semibold" style={styles.btnSolidText}>{confirmLabel}</AppText>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.card,
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.onAccent,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: spacing.lg,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
  btnWrap: { flex: 1 },
  btn: { paddingVertical: 11, borderRadius: radius.full, alignItems: 'center' },
  // Ghost sits on the orange itself, so its edge is a translucent white rather
  // than a border colour from the palette (which would be invisible here).
  btnGhost: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)' },
  btnGhostText: { fontSize: 13, color: colors.onAccent },
  btnSolid: { backgroundColor: colors.onAccent },
  btnSolidText: { fontSize: 13, color: colors.primary },
});
