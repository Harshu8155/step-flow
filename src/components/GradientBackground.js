// GradientBackground — the soft "pastel AI" aurora wash that sits behind scroll
// content on every screen. Reads grad / gradStops from the active theme so it
// works in both light and dark mode.
//
//   npx expo install expo-linear-gradient
//
// react-native-svg gives us multiple radial gradient "blobs" layered over a
// base linear gradient, matching the CSS multi-radial design exactly.
import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

export default function GradientBackground({ style, children }) {
  const { colors } = useTheme();
  const { width, height } = Dimensions.get('window');
  const stops = colors.gradStops || [];

  return (
    <View style={[styles.fill, style]}>
      {/* base linear wash */}
      <LinearGradient
        colors={colors.grad}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* layered radial "aurora" blobs */}
      <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
        <Defs>
          {stops.map((s, i) => (
            <RadialGradient
              key={i}
              id={`blob${i}`}
              cx={`${s.at[0] * 100}%`}
              cy={`${s.at[1] * 100}%`}
              rx={`${s.size[0] * 60}%`}
              ry={`${s.size[1] * 55}%`}
              gradientUnits="userSpaceOnUse"
              fx={`${s.at[0] * 100}%`}
              fy={`${s.at[1] * 100}%`}
            >
              <Stop offset="0" stopColor={s.color} stopOpacity="0.9" />
              <Stop offset="0.55" stopColor={s.color} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>
        {stops.map((s, i) => (
          <Rect key={i} x="0" y="0" width={width} height={height} fill={`url(#blob${i})`} />
        ))}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
