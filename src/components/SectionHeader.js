import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import PressableScale from './PressableScale';
import { fonts } from '../theme';
import { useTheme } from '../theme/ThemeContext';

export default function SectionHeader({ title, action, onAction }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <AppText weight="medium" style={styles.title}>{title}</AppText>
      {action ? (
        <PressableScale
          onPress={onAction}
          scale={0.94}
          // A bare text link is a small target; pad the hit area out to ~44pt
          // without changing the layout.
          hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
        >
          <AppText weight="medium" style={styles.action}>{action}</AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 15, color: colors.text },
  action: { fontSize: 12, color: colors.primary },
});
