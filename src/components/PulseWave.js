// PulseWave — the live PPG trace drawn while a heart-rate measurement runs.
//
// This shows the *filtered* signal, not the raw camera brightness. Raw values
// sit around some arbitrary DC level and drift with breathing, so plotting them
// would produce a wandering line with the actual pulse invisible inside it. What
// gets passed in here has already been band-passed, so the only thing left is
// the beat itself.
//
// The vertical scale is normalised per-render against the window's own peak
// rather than being fixed. Absolute PPG amplitude depends on finger pressure and
// skin tone and varies by orders of magnitude between people — a fixed scale
// would be a flat line for one user and clipped for the next.
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme';

export default function PulseWave({
  data = [],
  width = 280,
  height = 64,
  strokeWidth = 2,
}) {
  const { colors } = useTheme();

  const d = useMemo(() => {
    if (data.length < 2) return null;

    let min = Infinity;
    let max = -Infinity;
    for (const v of data) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    // A flat window has no meaningful scale. Guarding here is what stops a
    // motionless signal — no torch, or a finger not touching the lens — from
    // being amplified into convincing-looking noise.
    const span = max - min;
    if (!(span > 1e-6)) return null;

    // Leave a little headroom so peaks don't sit flush against the edge.
    const pad = height * 0.12;
    const usable = height - pad * 2;
    const stepX = width / (data.length - 1);

    let path = '';
    for (let i = 0; i < data.length; i++) {
      const x = i * stepX;
      // Invert: larger values should rise on screen, but SVG y grows downward.
      const y = pad + usable * (1 - (data[i] - min) / span);
      path += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return path;
  }, [data, width, height]);

  return (
    <View style={[styles.wrap, { width, height, borderRadius: radius.sm }]}>
      <Svg width={width} height={height}>
        {/* Baseline, so an empty or flat trace still reads as "no signal"
            rather than as a rendering failure. */}
        <Line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={colors.border}
          strokeWidth={1}
        />
        {d && (
          <Path
            d={d}
            stroke={colors.primary}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});
