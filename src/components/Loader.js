// Loader — replaces ActivityIndicator.
//
// ActivityIndicator renders the platform spinner: on Android that's the Material
// circular progress, which carries Google's motion curve and none of this app's.
// This is the brand mark in motion instead — the orange arc from the splash icon
// spinning, with the three step bars pulsing in sequence underneath it.
//
// Both animations are native-driven (rotate + scaleY are transforms), so a loader
// on screen costs nothing per frame even while a list is scrolling.
import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from './AppText';
import { fonts, spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';

const SWEEP = 0.72;    // fraction of the ring drawn, matching the app icon
const MIN_SCALE = 0.4; // how far the bars collapse at the bottom of the pulse

export default function Loader({ size = 56, label, color, style, bars = true }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const arcColor = color || colors.primary;

  const spin = useRef(new Animated.Value(0)).current;
  // One value per bar, each loop started a beat after the last. Driving all three
  // off a single shared clock would need phase-shifted interpolations, and an
  // interpolation's inputRange has to stay sorted — which breaks its pairing with
  // outputRange as soon as a phase wraps past 1.
  const barAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const barLoops = barAnims.map((v, i) => Animated.loop(
      Animated.sequence([
        Animated.delay(i * 130),
        Animated.timing(v, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 380, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ));
    spinLoop.start();
    barLoops.forEach(l => l.start());
    return () => { spinLoop.stop(); barLoops.forEach(l => l.stop()); };
  }, [spin, barAnims]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const stroke = Math.max(size * 0.1, 3);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  // Bars live inside the ring, so they scale with it.
  const barW = Math.max(size * 0.085, 3);
  const barMax = size * 0.30;
  const heights = [0.45, 0.75, 1];

  return (
    <View style={[styles.wrap, style]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke={arcColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${circumference * SWEEP} ${circumference}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
        </Animated.View>

        {bars && (
          <View style={[styles.barRow, { gap: barW * 0.7 }]}>
            {heights.map((h, i) => {
              const barH = barMax * h;
              const scaleY = barAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [MIN_SCALE, 1],
              });
              // scaleY grows from the centre, which would make the bars float
              // off their baseline; shifting by half the shrinkage pins them.
              const translateY = barAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [(barH * (1 - MIN_SCALE)) / 2, 0],
              });
              return (
                <Animated.View
                  key={i}
                  style={{
                    width: barW,
                    height: barH,
                    borderRadius: barW / 2,
                    backgroundColor: colors.text,
                    transform: [{ translateY }, { scaleY }],
                  }}
                />
              );
            })}
          </View>
        )}
      </View>

      {label ? <AppText style={styles.label}>{label}</AppText> : null}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'flex-end' },
  label: { fontSize: 12, fontFamily: fonts.medium, color: colors.muted, marginTop: spacing.md },
});
