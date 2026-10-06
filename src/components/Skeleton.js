// Skeleton — shimmer placeholder shown while step data hydrates.
//
// StepContext reads from AsyncStorage on mount, so without this the app paints a
// confident "0 steps" for a beat and then snaps to the real number, which reads
// as a bug rather than as loading. A shimmering block reads as "not yet".
//
// The sweep is a translucent highlight translated across the block on the native
// driver, so many skeletons on screen at once still cost nothing per frame.
import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius as R } from '../theme';

export default function Skeleton({ width = '100%', height = 16, radius = R.sm, style }) {
  const { colors, isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;
  // The sweep travels a fixed pixel distance, so a percentage width still needs
  // a concrete number to interpolate over. 240 covers every block we render.
  const span = typeof width === 'number' ? width : 240;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-span, span],
  });

  const base = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
  const highlight = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.85)';

  return (
    <View
      style={[
        { width, height, borderRadius: radius, backgroundColor: base, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: highlight, opacity: 0.6, transform: [{ translateX }] },
        ]}
      />
    </View>
  );
}

// SkeletonGroup — a few stacked lines, for card bodies.
export function SkeletonGroup({ lines = 3, gap = 8, height = 14, style }) {
  const widths = useMemo(
    () => Array.from({ length: lines }, (_, i) => (i === lines - 1 ? '60%' : '100%')),
    [lines]
  );
  return (
    <View style={style}>
      {widths.map((w, i) => (
        <Skeleton key={i} width={w} height={height} style={i ? { marginTop: gap } : null} />
      ))}
    </View>
  );
}
