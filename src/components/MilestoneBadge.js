import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { radius, spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import LineIcon from './LineIcon';

/**
 * MilestoneBadge
 * @param {string}  icon       - LineIcon name (e.g. 'medal', 'target', 'bolt', 'flame')
 * @param {string}  name       - milestone name
 * @param {string}  desc       - short description
 * @param {boolean} completed  - whether milestone is earned
 */
export default function MilestoneBadge({ icon, name, desc, completed }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, completed && styles.iconWrapDone]}>
        <LineIcon name={icon} size={20} color={completed ? colors.primary : colors.muted} />
      </View>
      <View style={styles.body}>
        <AppText weight="medium" style={styles.name}>{name}</AppText>
        <AppText style={styles.desc}>{desc}</AppText>
      </View>
      <View style={[styles.check, completed && styles.checkDone]}>
        <AppText weight="semibold" style={[styles.checkText, { color: completed ? colors.accent : colors.mutedDark }]}>
          {completed ? '✓' : '○'}
        </AppText>
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDone: {
    backgroundColor: colors.primaryTint,
  },
  body: { flex: 1 },
  name: { fontSize: 13, color: colors.text },
  desc: { fontSize: 11, color: colors.muted, marginTop: 1 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.successBg },
  checkText: { fontSize: 11 },
});
