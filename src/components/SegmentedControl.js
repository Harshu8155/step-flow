// SegmentedControl — the Week / Month / Year switcher.
//
// Deliberately the same treatment as the bottom nav bar: a dark track with a
// travelling white pill. Reusing the nav bar's exact tokens (tabBar /
// tabBarActive / tabBarActiveText / tabBarIdle) means the two controls stay in
// step if the palette moves, and the user learns one visual rule for "the
// selected thing" instead of two.
//
// An orange fill was the alternative, but orange is the accent for progress and
// calls to action — spending it on a passive range switch dilutes it.
//
// The thumb is one absolutely-positioned view rather than a background on each
// option, so the selection slides instead of blinking between states.
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { AppText } from './AppText';
import PressableScale from './PressableScale';
import { radius, fonts, shadows } from '../theme';
import { useTheme } from '../theme/ThemeContext';

const PAD = 4;

export default function SegmentedControl({ options = [], value = 0, onChange, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [trackWidth, setTrackWidth] = useState(0);
  const slide = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: value,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  }, [value, slide]);

  const segWidth = trackWidth > 0 ? (trackWidth - PAD * 2) / options.length : 0;
  const translateX = slide.interpolate({
    inputRange: options.map((_, i) => i),
    // A single-option control would give interpolate a degenerate range, so the
    // thumb only renders once there are at least two segments to move between.
    outputRange: options.map((_, i) => i * segWidth),
  });

  return (
    <View
      style={[styles.track, style]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {trackWidth > 0 && options.length > 1 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, { width: segWidth, transform: [{ translateX }] }]}
        />
      )}
      {options.map((opt, i) => (
        <PressableScale
          key={opt}
          onPress={() => onChange?.(i)}
          haptic="selection"
          scale={0.96}
          containerStyle={styles.segment}
          style={styles.segmentInner}
        >
          <AppText
            weight={i === value ? 'semibold' : 'medium'}
            style={[styles.text, { color: i === value ? colors.tabBarActiveText : colors.tabBarIdle }]}
          >
            {opt}
          </AppText>
        </PressableScale>
      ))}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.tabBar,
    borderRadius: radius.full,
    padding: PAD,
    alignSelf: 'stretch',
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    bottom: PAD,
    backgroundColor: colors.tabBarActive,
    borderRadius: radius.full,
    ...shadows.card,
  },
  segment: { flex: 1 },
  segmentInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 9 },
  text: { fontSize: 13, letterSpacing: -0.2 },
});
