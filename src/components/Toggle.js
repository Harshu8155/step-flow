// Toggle — replaces React Native's <Switch>.
//
// <Switch> renders the platform control, which on Android is the Material 3
// switch: its own colour ramp, its own thumb size, and a check glyph when on.
// No amount of trackColor/thumbColor makes it belong to this design, so it is
// replaced outright with a track and thumb we own.
//
// The thumb slides on the native driver; the track colour cross-fades, which
// can't use the native driver, so it runs as a separate interpolation on a JS
// value. Both are cheap here because a toggle animates in isolation.
import React, { useRef, useEffect, useMemo } from 'react';
import { Animated, StyleSheet, Platform } from 'react-native';
import PressableScale from './PressableScale';
import { shadows } from '../theme';
import { useTheme } from '../theme/ThemeContext';

const W = 50;
const H = 30;
const PAD = 3;
const THUMB = H - PAD * 2;

export default function Toggle({ value, onValueChange, disabled, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const slide = useRef(new Animated.Value(value ? 1 : 0)).current;
  const tint = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      speed: 22,
      bounciness: 7,
    }).start();
    Animated.timing(tint, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false, // backgroundColor is not a native-driver prop
    }).start();
  }, [value, slide, tint]);

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, W - THUMB - PAD * 2],
  });

  const backgroundColor = tint.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface2, colors.primary],
  });

  return (
    <PressableScale
      onPress={() => onValueChange?.(!value)}
      disabled={disabled}
      haptic="light"
      scale={0.93}
      containerStyle={style}
      accessibilityRole="switch"
      accessibilityState={{ checked: !!value, disabled: !!disabled }}
    >
      <Animated.View style={[styles.track, { backgroundColor }, disabled && styles.disabled]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </PressableScale>
  );
}

const createStyles = (colors) => StyleSheet.create({
  track: {
    width: W,
    height: H,
    borderRadius: H / 2,
    padding: PAD,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    // A plain white circle on a light track needs the lift to stay legible.
    ...Platform.select({ ios: shadows.card, android: { elevation: 3 } }),
  },
  disabled: { opacity: 0.45 },
});
