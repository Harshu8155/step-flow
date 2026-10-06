// QuickActions — the row of circular icon buttons under the goal card.
//
// Each action is a white circle with a line icon and a small label beneath.
// They're evenly distributed rather than in a scroll strip: the set is short
// and fixed, and a row that fits exactly reads as a deliberate set of choices.
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import PressableScale from './PressableScale';
import LineIcon from './LineIcon';
import { fonts, shadows, spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';

export default function QuickActions({ actions = [], style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.row, style]}>
      {actions.map((a) => (
        <PressableScale
          key={a.key || a.label}
          onPress={a.onPress}
          haptic="light"
          scale={0.9}
          containerStyle={styles.item}
          style={styles.itemInner}
          disabled={!a.onPress}
        >
          <View style={[styles.circle, a.active && { backgroundColor: colors.primary }]}>
            <LineIcon
              name={a.icon}
              size={21}
              color={a.active ? colors.onAccent : colors.text}
              strokeWidth={1.7}
            />
          </View>
          <AppText style={styles.label} numberOfLines={1}>{a.label}</AppText>
        </PressableScale>
      ))}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: spacing.xl },
  item: { flex: 1 },
  itemInner: { alignItems: 'center' },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  label: { fontSize: 11, fontFamily: fonts.medium, color: colors.textSecondary, marginTop: 8 },
});
