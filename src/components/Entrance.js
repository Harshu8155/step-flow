import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

export const stagger = (i, step = 40, max = 5) =>
  Math.min(i, max) * step;

const PRESETS = {
  up: { from: { ty: 16, tx: 0, scale: 1 } },
  left: { from: { ty: 0, tx: -14, scale: 1 } },
  pop: { from: { ty: 0, tx: 0, scale: 0 } },
};

export default function Entrance({
  children,
  preset = 'up',
  delay = 0,
  duration = 320,
  trigger,
  style,
}) {
  const p = PRESETS[preset] || PRESETS.up;

  const t = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Immediately visible on first render.
    // Only animate when trigger changes.
    if (trigger === undefined) {
      return;
    }

    t.setValue(1);

    Animated.timing(t, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [trigger]);

  const opacity = t;

  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [p.from.ty, 0],
  });

  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [p.from.tx, 0],
  });

  const scale = t.interpolate({
    inputRange: [0, 1],
    outputRange: [p.from.scale, 1],
  });

  return (
    <Animated.View
      style={[
        {
          opacity,
          transform: [
            { translateY },
            { translateX },
            { scale },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}