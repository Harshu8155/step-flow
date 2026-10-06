// AnimatedCount — a number that counts up to its value instead of snapping.
//
// A step counter that jumps straight to its final value is the clearest "this is
// a prototype" tell, so every headline number in the app rolls instead.
//
// The count is driven straight into an uneditable TextInput via setNativeProps:
// listening to the Animated.Value and calling setState would re-render the tree
// ~60x a second, whereas this touches only the native text. `format` controls
// the rendering (defaults to thousands separators).
import React, { useRef, useEffect } from 'react';
import { TextInput, Platform, Animated, Easing } from 'react-native';
import { fonts } from '../theme';

const defaultFormat = (n) => Math.round(n).toLocaleString();

export default function AnimatedCount({
  value = 0,
  duration = 1100,
  delay = 250,
  format = defaultFormat,
  weight = 'display',
  style,
  ...rest
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const ref = useRef(null);
  // Where the previous run ended — so an update counts on from the old number
  // rather than restarting from zero every time the step count ticks.
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    const end = Number(value) || 0;
    anim.setValue(0);

    const id = anim.addListener(({ value: t }) => {
      const n = start + (end - start) * t;
      ref.current?.setNativeProps({ text: format(n) });
    });

    Animated.timing(anim, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => { from.current = end; });

    return () => anim.removeListener(id);
  }, [value]);

  return (
    <TextInput
      ref={ref}
      editable={false}
      // Android draws a TextInput with baked-in padding + an underline that a
      // Text does not have; strip both so this drops into any Text slot.
      underlineColorAndroid="transparent"
      defaultValue={format(from.current)}
      {...rest}
      style={[
        { fontFamily: fonts[weight] || fonts.display, padding: 0 },
        Platform.OS === 'android' && { includeFontPadding: false, textAlignVertical: 'center' },
        style,
      ]}
    />
  );
}
