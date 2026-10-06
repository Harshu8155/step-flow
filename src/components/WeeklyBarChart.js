import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

/**
 * WeeklyBarChart — redesign: gradient active bars + a staggered grow-up
 * animation that replays whenever `data`/`replayKey` changes.
 * @param {Array}  data         - [{ day: 'M', value: 7200 }, ...]
 * @param {number} maxValue     - override max (defaults to max in data)
 * @param {number} activeIndex  - index of highlighted bar
 * @param {number} height       - chart height in px (default 80)
 * @param {any}    replayKey    - change to re-trigger the grow animation
 */
function Bar({ barH, zero, isActive, colors, index }) {
  const finalH = zero ? 4 : barH;
  const grow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    grow.setValue(0);
    Animated.timing(grow, {
      toValue: 1,
      duration: 550,
      delay: 120 + Math.min(index, 6) * 45,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [finalH]);

  // The bar is laid out at its full height and scaled up into place, rather than
  // animating `height` — a layout prop, which can't use the native driver and
  // so paid a bridge round-trip every frame while the chart was on screen.
  //
  // scaleY grows from the centre, so pair it with a translateY of half the
  // shrinkage to keep the bar pinned to the flex-end baseline.
  const scaleY = grow.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] });
  const translateY = grow.interpolate({ inputRange: [0, 1], outputRange: [finalH / 2, 0] });

  return (
    <View style={styles.barWrapper}>
      <Animated.View
        style={[
          styles.bar,
          {
            height: finalH,
            backgroundColor: isActive ? colors.primary : colors.accent,
            opacity: zero ? 0.18 : isActive ? 1 : 0.85,
            transform: [{ translateY }, { scaleY }],
          },
        ]}
      />
    </View>
  );
}

export default function WeeklyBarChart({ data = [], maxValue, activeIndex, height = 80, replayKey }) {
  const { colors } = useTheme();
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <View>
      <View style={[styles.chart, { height }]}>
        {data.map((item, i) => {
          const barH = Math.max((item.value / max) * (height - 8), 4);
          return (
            <Bar
              key={`${replayKey}-${i}`}
              index={i}
              barH={barH}
              zero={item.value === 0}
              isActive={i === activeIndex}
              colors={colors}
            />
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((item, i) => (
          <AppText
            key={i}
            weight={i === activeIndex ? 'semibold' : 'regular'}
            style={[styles.dayLabel, { color: i === activeIndex ? colors.primary : colors.muted }]}
          >
            {item.day}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '62%', borderRadius: 3 },
  labels: { flexDirection: 'row', marginTop: 6 },
  dayLabel: { flex: 1, fontSize: 10, textAlign: 'center' },
});
