// LiquidGlassBar — the floating tab bar's water-droplet shell.
//
// Two jobs, and they're separate:
//
//  1. LOOK like water. A blurred pane lets the screen bend through the bar
//     instead of being covered by it, a bright meniscus runs along the top rim,
//     and a specular highlight slides across the surface. Those layers are what
//     read as "a droplet" rather than "a dark rectangle".
//
//  2. MOVE like water. `position` from react-native-tab-view tracks the pager
//     continuously (0..n-1) while the finger is down. A spring follower chases
//     it, and the GAP between the two is the deformation — no velocity maths,
//     no frame timing, and the spring's overshoot supplies the settle wobble
//     for free. Swipe fast and the bar stretches and leans behind the gesture;
//     let go and it jiggles to rest.
//
// The deformation is on the outer shell, so the icons inside stretch with it —
// that's what makes it read as one body of jelly rather than a moving box.
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';

// Backdrop blur is iOS-only here, and that is a deliberate retreat.
//
// Android never blurred by default; you had to name a method. Up to SDK 54 that
// was `experimentalBlurMethod="dimezisBlurView"` and it worked on its own. SDK
// 55 renamed it to `blurMethod`, and SDK 56 additionally requires a `blurTarget`
// — a BlurTargetView wrapping the content to sample. Wrapping the screens in one
// renders the whole app through an offscreen buffer, which on this emulator came
// out visibly washed out: grey text, doubled card edges. A blur behind one small
// bar is not worth degrading every screen, so Android skips the BlurView and
// leans on a denser fill instead. Revisit if expo-blur makes the target cheaper.
const BACKDROP_BLUR = Platform.OS !== 'android';

// iOS 26 refracts what's behind the bar for real — the system material warps
// and magnifies the backdrop, which no amount of blur-and-gradients can fake.
// Where that exists, hand the surface to it and drop our imitation entirely;
// doubling the two would put our painted highlights on top of real ones.
//
// Safe to call at module scope on every platform: the package ships an
// off-iOS build where this returns false and GlassView is a plain View.
const LIQUID_GLASS = isLiquidGlassAvailable();

// Glass is switched OFF for now. With it on, the bar renders as a plain opaque
// pill: no blur, no gradient stack, no jelly deformation. Everything below is
// kept intact so the effect can come back on with one line — the intended
// route is a real Android backdrop blur (Dimezis BlurView, which is what
// expo-blur already wraps) rather than the painted imitation.
const GLASS = false;

// Loose and light: high overshoot is the whole point, since the bounce-back IS
// the jelly. Damping much above ~14 kills the wobble and it reads as a slide.
const SPRING = { damping: 11, stiffness: 150, mass: 0.9 };

// How far one screen of swipe pushes the shell around. Tuned so a full-speed
// flick lands near the caps below without ever looking like a glitch.
const LEAN = 16;      // px of horizontal drag
const SKEW = 3.2;     // degrees of lean
const STRETCH = 0.09; // fraction of width gained at full drift
const SQUASH = 0.06;  // fraction of height lost at full drift

// `tabBar` is a solid hex token. Water has to be see-through, so the fill drops
// to an alpha wash and the blur behind it supplies the rest of the density.
export function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export default function LiquidGlassBar({
  position,   // Animated node from react-native-tab-view; continuous during a swipe
  index,      // fallback + initial value when `position` isn't available
  children,
  style,
}) {
  const { colors, isDark } = useTheme();

  // In light mode the bar is a dark droplet on a pale ground; in dark mode it
  // flips. Every highlight below is keyed off which way round it currently is.
  const barIsDark = !isDark;
  const styles = useMemo(() => createStyles(colors, barIsDark), [colors, barIsDark]);

  // Fabric will not resolve an absolute child from insets alone when the parent
  // is sized by its children, so the layer stack is handed explicit dimensions
  // measured off the shell. Without this every gradient silently draws nothing.
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const onLayout = React.useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  }, []);

  const pos = useSharedValue(index ?? 0);

  // Mirror the pager's offset onto the UI thread. The listener is one number
  // per frame on the JS thread; everything downstream of `pos` is a worklet.
  useEffect(() => {
    if (!position || typeof position.addListener !== 'function') {
      // No pager node (or a version that doesn't expose one) — fall back to
      // jumping on tab change, which still fires the spring and so still wobbles.
      pos.value = index ?? 0;
      return undefined;
    }
    const id = position.addListener(({ value }) => {
      pos.value = value;
    });
    return () => position.removeListener(id);
  }, [position, index, pos]);

  const lag = useDerivedValue(() => withSpring(pos.value, SPRING));

  // Clamped to ±1 so a five-tab jump (tap Home -> Profile) deforms exactly as
  // hard as a one-tab swipe instead of turning the bar inside out.
  const drift = useDerivedValue(() => {
    const d = pos.value - lag.value;
    return d > 1 ? 1 : d < -1 ? -1 : d;
  });

  const jelly = useAnimatedStyle(() => {
    const d = drift.value;
    const a = Math.abs(d);
    return {
      transform: [
        { translateX: d * LEAN },
        { skewX: `${-d * SKEW}deg` },
        { scaleX: 1 + a * STRETCH },
        { scaleY: 1 - a * SQUASH },
      ],
    };
  });

  // Light through moving water: the highlight lags the body, so it slides the
  // opposite way and flares as the surface tilts.
  const sheen = useAnimatedStyle(() => ({
    opacity: 0.18 + Math.abs(drift.value) * 0.45,
    transform: [{ translateX: -drift.value * 46 }],
  }));

  // Plain mode: a solid bar and nothing else. `style` still carries the row
  // layout from the navigator, so the tabs sit exactly where they did.
  if (!GLASS) {
    return <View style={[styles.plain, style]}>{children}</View>;
  }

  return (
    <Animated.View style={[styles.shell, jelly, style]} onLayout={onLayout}>
      {LIQUID_GLASS ? (
        <GlassView
          style={styles.layers}
          glassEffectStyle="clear"
          // Keeps the bar's identity as a dark drop; the material supplies the
          // refraction, the rim light and the specular on its own.
          tintColor={styles.tokens.glassTint}
          pointerEvents="none"
        />
      ) : (
      <View style={[styles.layers, { width: size.w, height: size.h }]} pointerEvents="none">
        {BACKDROP_BLUR && (
          <BlurView intensity={60} tint={barIsDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        )}
        {/* Thin enough that the screen keeps its colour through the glass. Push
            this much past ~0.5 and it stops being water and starts being paint. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: styles.tokens.fill }]} />

        {/* Meniscus: light gathers where the surface curves up to the top rim,
            and again where it wraps under the bottom — the two bright bands are
            most of what sells "liquid" rather than "frosted". */}
        <LinearGradient
          colors={[styles.tokens.topHi, 'transparent', 'transparent', styles.tokens.botHi]}
          locations={[0, 0.42, 0.68, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Lens caps. A real droplet compresses what's behind it towards the
            ends, which shows up as a brightening at each cap. */}
        <LinearGradient
          colors={[styles.tokens.cap, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.cap, { left: 0 }]}
        />
        <LinearGradient
          colors={['transparent', styles.tokens.cap]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.cap, { right: 0 }]}
        />

        <Animated.View style={[styles.sheen, sheen]}>
          <LinearGradient
            colors={['transparent', styles.tokens.sheen, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Chromatic fringe. Glass this thick splits the light at its edges;
            without the cool/warm pair the rim reads as a drawn stroke. */}
        <View style={[styles.fringe, { top: 0, backgroundColor: styles.tokens.cool }]} />
        <View style={[styles.fringe, { bottom: 0, backgroundColor: styles.tokens.warm }]} />

        {/* Two rings, not one: the inset ring is the glass's inner wall, and the
            gap between them is what gives the edge thickness. */}
        <View style={styles.innerRim} />
        <View style={styles.rim} />
      </View>
      )}

      {children}
    </Animated.View>
  );
}

const createStyles = (colors, barIsDark) => {
  const tokens = {
    // A wash, not a coat. The blur behind supplies the density; this only tints
    // it. Much above ~0.5 and the screen stops showing through at all.
    // With a real backdrop blur behind it a thin wash is enough; without one
    // (Android) the same alpha just looks like a smudge, so it goes denser.
    fill: withAlpha(colors.tabBar, BACKDROP_BLUR ? (barIsDark ? 0.44 : 0.48) : (barIsDark ? 0.82 : 0.86)),
    topHi: barIsDark ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.62)',
    botHi: barIsDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.34)',
    cap: barIsDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.30)',
    rim: barIsDark ? 'rgba(255,255,255,0.44)' : 'rgba(255,255,255,0.85)',
    innerRim: barIsDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.35)',
    cool: 'rgba(150,200,255,0.20)',
    warm: 'rgba(255,160,120,0.14)',
    sheen: barIsDark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.85)',
    // Only used on iOS 26. Kept light — the system material is doing the work,
    // and a heavy tint turns Liquid Glass back into a coloured panel.
    glassTint: withAlpha(colors.tabBar, barIsDark ? 0.18 : 0.22),
  };

  return Object.assign(
    StyleSheet.create({
      // Used while GLASS is off. Fully opaque, so the elevation lift is safe on
      // Android here — the grey backing that forced the iOS-only shadow on the
      // shell below only shows through a translucent background.
      plain: {
        backgroundColor: colors.tabBar,
        borderRadius: radius.full,
        overflow: 'hidden',
        ...Platform.select({
          ios: {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.14,
            shadowRadius: 18,
          },
          android: { elevation: 8 },
          default: {},
        }),
      },
      shell: {
        // The surface lives on the shell rather than in an absolutely-positioned
        // child: under Fabric an absolute child with only inset:0 collapses to
        // zero size against a parent that is sized by its own children, so every
        // layer painted inside one was invisible.
        backgroundColor: tokens.fill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: tokens.rim,
        overflow: 'hidden',
        borderRadius: radius.full,
        // Android draws an opaque backing behind an elevated view whose
        // background is translucent — which would put a grey slab inside the
        // droplet, so the lift is iOS-only.
        ...Platform.select({
          ios: {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.16,
            shadowRadius: 22,
          },
          default: {},
        }),
      },
      // Width and height are supplied at render time from the measured shell;
      // the insets alone are not enough under Fabric (see onLayout above).
      //
      // `absoluteFill`, not `absoluteFillObject`: RN 0.85 removed the latter, and
      // spreading the resulting `undefined` silently drops `position: 'absolute'`.
      // The layer stack then joins the row as an in-flow child, the measured size
      // fed back into it grows the shell on every layout pass, and the bar swells
      // into a grey slab over the whole screen with the tabs pushed out of view.
      layers: {
        ...StyleSheet.absoluteFill,
        borderRadius: radius.full,
        overflow: 'hidden',
      },
      sheen: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '18%',
        width: '46%',
        transform: [{ skewX: '-12deg' }],
      },
      cap: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '22%',
      },
      // Hairlines rather than gradients: at 1px the fringe reads as refraction
      // at the edge, and at 2px it reads as a coloured border.
      fringe: {
        position: 'absolute',
        left: '10%',
        right: '10%',
        height: StyleSheet.hairlineWidth * 2,
      },
      innerRim: {
        position: 'absolute',
        top: 2,
        left: 2,
        right: 2,
        bottom: 2,
        borderRadius: radius.full,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: tokens.innerRim,
      },
      rim: {
        ...StyleSheet.absoluteFill,
        borderRadius: radius.full,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: tokens.rim,
      },
    }),
    { tokens }
  );
};
