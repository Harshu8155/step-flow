// RingProgress
// - single arc sweeping orange -> ink (primary -> accent), on a light track
// - flat: no glow behind the ring
// - animated "draw" sweep, with the value counting up on the same beat
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme';
import AnimatedCount from './AnimatedCount';

// Call sites pass either a number (8432) or an already-formatted string
// ("8,432" / "8.2 km"). Only the first two can be counted up to.
const numericValue = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const stripped = v.replace(/[,\s]/g, '');
    if (/^\d+$/.test(stripped)) return Number(stripped);
  }
  return null;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function RingProgress({
  size = 180,
  strokeWidth = 14,
  progress = 0.75,
  label,
  value,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const countTo = numericValue(value);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const target = circumference * (1 - Math.min(progress, 1));

  const anim = useRef(new Animated.Value(circumference)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: target,
        duration: 1200,
        delay: 150,
        easing: Easing.bezier(0.22, 0.61, 0.36, 1),
        useNativeDriver: true,
      }),
    ]).start();
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, delay: 350, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 600, delay: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [target]);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primary} />
            <Stop offset="1" stopColor={colors.accent} />
          </LinearGradient>
        </Defs>
        {/* The soft radial glow behind the ring is gone: this design is flat, and
            a coloured haze on a white card read as a rendering artifact. */}
        {/* track */}
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.surface2} strokeWidth={strokeWidth} />
        {/* animated gradient progress arc */}
        <AnimatedCircle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={anim}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      {/* Used bare (small, inline) as well as as a hero. With no value or label
          the centre block would still reserve its 42px line height and burst a
          46px ring, so skip it entirely rather than render empty text. */}
      {(value === '' || value == null) && !label ? null : (
      <Animated.View style={{ alignItems: 'center', opacity: fade, transform: [{ translateY: rise }] }}>
        {/* The arc drew itself over 1200ms while the number sat at its final
            value. When `value` is numeric, roll it on the same beat; anything
            pre-formatted (e.g. "8.2 km") still renders as plain text. */}
        {countTo === null ? (
          <Text style={styles.value}>{value}</Text>
        ) : (
          <AnimatedCount
            value={countTo}
            duration={1150}
            delay={150}
            // A TextInput has no intrinsic width and its parent centres rather
            // than stretches, so it needs an explicit one or it collapses to
            // nothing. Span the ring's inner area and centre the text in it.
            style={[styles.value, { width: size - strokeWidth * 2, textAlign: 'center' }]}
          />
        )}
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </Animated.View>
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  value: { fontSize: 36, fontFamily: fonts.displayExtra, color: colors.text, lineHeight: 42, letterSpacing: -1.6 },
  label: { fontSize: 11, fontFamily: fonts.medium, color: colors.muted, marginTop: 4, letterSpacing: 0 },
});
