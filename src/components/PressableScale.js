// PressableScale — the standard touch target for the app.
//
// Replaces TouchableOpacity's opacity-only fade with a spring scale-down plus an
// optional haptic tick, which is what makes a press read as "physical" rather
// than as a flat colour change.
//
// `haptic` picks the feedback: 'selection' (default — nav, chips, toggles),
// 'light' | 'medium' (buttons), or false to stay silent. The scale runs on the
// native driver so it stays smooth while a list is scrolling.
import React, { useRef, useCallback, useMemo } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { tapSelection, tapLight, tapMedium } from '../utils/haptics';

const HAPTICS = { selection: tapSelection, light: tapLight, medium: tapMedium };

// Props that position the touchable *within its parent*. These have to live on
// the outer Pressable — a `flex: 1` left on the inner animated view would size
// that view inside a shrink-wrapped parent, so the row would collapse instead of
// splitting evenly. Everything else (padding, background, radius, borders, and
// explicit width/height) stays on the inner view, which is what gets scaled.
//
// Hoisting these automatically is what lets `style` behave the way it did on the
// TouchableOpacity this replaced, so call sites don't each need rewriting.
const LAYOUT_PROPS = [
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginHorizontal', 'marginVertical',
  'position', 'top', 'right', 'bottom', 'left', 'zIndex',
];

function splitStyle(style) {
  const flat = StyleSheet.flatten(style) || {};
  const outer = {};
  const inner = {};
  for (const key of Object.keys(flat)) {
    (LAYOUT_PROPS.includes(key) ? outer : inner)[key] = flat[key];
  }
  return { outer, inner };
}

export default function PressableScale({
  children,
  style,          // applied to the animated inner view
  containerStyle, // applied to the Pressable itself (layout: flex, margins)
  scale = 0.97,
  haptic = 'selection',
  disabled,
  onPress,
  ...rest
}) {
  const s = useRef(new Animated.Value(1)).current;
  const { outer, inner } = useMemo(() => splitStyle(style), [style]);

  const spring = useCallback((toValue) => {
    Animated.spring(s, { toValue, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  }, [s]);

  const handlePress = useCallback((e) => {
    if (haptic && HAPTICS[haptic]) HAPTICS[haptic]();
    onPress?.(e);
  }, [haptic, onPress]);

  return (
    <Pressable
      onPressIn={() => !disabled && spring(scale)}
      onPressOut={() => spring(1)}
      onPress={handlePress}
      disabled={disabled}
      style={[outer, containerStyle]}
      {...rest}
    >
      <Animated.View style={[inner, { transform: [{ scale: s }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
