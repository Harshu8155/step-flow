import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import GlassCard from './GlassCard';
import { AppText } from './AppText';
import { radius, spacing, fonts } from '../theme';
import { useTheme } from '../theme/ThemeContext';

// StatCard — a white tile with a quiet label above a large, tightly-tracked
// number. Left-aligned rather than centred: a column of left-aligned numbers
// shares a common edge, which is what makes a row of these read as a set.
//
// `color` is for an intentional accent only; the default is neutral ink, so
// orange keeps meaning "this is the live/active one".
export default function StatCard({ label, value, unit, color, flex = 1, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const valueColor = color || colors.text;

  return (
    <GlassCard flex={flex} radius={radius.md} padding={spacing.lg} style={[styles.card, { flex }, style]}>
      <AppText style={styles.label}>{label}</AppText>
      <View style={styles.valueRow}>
        <AppText style={[styles.value, { color: valueColor }]}>{value}</AppText>
        {unit ? <AppText style={styles.unit}>{unit}</AppText> : null}
      </View>
    </GlassCard>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: { marginHorizontal: 4, justifyContent: 'space-between' },
  label: { fontSize: 11, fontFamily: fonts.medium, color: colors.muted, marginBottom: 6 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  value: { fontSize: 22, fontFamily: fonts.display, letterSpacing: -0.8 },
  unit: { fontSize: 11, fontFamily: fonts.medium, color: colors.muted, marginLeft: 3 },
});
