// Heart rate via fingertip PPG.
//
// The user covers the rear lens with a fingertip; the torch stays on, and a
// VisionCamera frame processor averages the red channel of a centred crop of
// every frame. That per-frame average is the raw signal — src/utils/heartRate.js
// does the filtering and peak detection that turns it into a BPM.
//
// Why a frame processor rather than a loop of takePictureAsync: PPG peak timing
// is the measurement, so irregular sample spacing translates directly into BPM
// error. The frame processor runs on a native thread at a steady ~30fps and
// carries a real timestamp per frame; a capture loop manages 5-8fps with tens of
// milliseconds of jitter, which is not good enough to time a beat with.
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, SafeAreaView, StatusBar, ScrollView, Animated, Easing, Linking,
} from 'react-native';
import {
  Camera, runAtTargetFps, useCameraDevice, useCameraFormat,
  useCameraPermission, useFrameProcessor,
} from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import {
  GradientBackground, GlassCard, Entrance, LineIcon, AppText, PressableScale, Button,
  PulseWave,
} from '../components';
import { spacing, radius, fonts, type } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { notifySuccess, tapLight } from '../utils/haptics';
import {
  estimateHeartRate, isFingerPresent, bandpass, resample, MIN_SECONDS,
} from '../utils/heartRate';

// We collect a little past heartRate.js's TARGET_SECONDS so the estimate has
// margin, and so a brief wobble mid-read does not leave us short of beats.
const MEASURE_MS = 20000;
// Frames whose red channel fails the finger check reset the buffer. One stray
// frame should not do that, so a short grace period absorbs the odd bad frame.
const LOST_GRACE_MS = 700;
// Below this the reading is too scattered to show as a result.
const MIN_CONFIDENCE = 0.35;
// How much history the live trace shows. Short enough that individual beats are
// distinguishable rather than crushed together, long enough to see a few.
const WAVE_WINDOW_MS = 5000;

export default function HeartRateScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  // The smallest usable format. We reduce every frame to a single brightness
  // number, so resolution buys literally nothing — and it costs a lot: CameraX
  // converts to RGBA_8888 in software, so the per-frame cost scales with pixel
  // count. 640x480@30 was enough to trigger the phone's overheating warning
  // within a 20-second measurement.
  const format = useCameraFormat(device, [
    { videoResolution: { width: 320, height: 240 } },
    { fps: 30 },
  ]);

  const [phase, setPhase] = useState('idle'); // idle | measuring | done | error
  const [fingerOn, setFingerOn] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveBpm, setLiveBpm] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [torchReady, setTorchReady] = useState(false);
  const [debug, setDebug] = useState(null);
  const [formatInfo, setFormatInfo] = useState(null);
  const [frameCount, setFrameCount] = useState(0);
  const [wave, setWave] = useState([]);

  const samplesRef = useRef([]);
  const startedAtRef = useRef(0);
  const lastGoodRef = useRef(0);
  const phaseRef = useRef('idle');
  // null = not yet decided; see onSample for how the clock choice is made.
  const useWallClockRef = useRef(null);
  const lastFrameMsRef = useRef(0);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // The heart glyph beats in time with the last estimate, so the screen shows
  // it is tracking something rather than just spinning a timer.
  const beat = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (phase !== 'measuring' || !liveBpm) return;
    const period = Math.max(300, 60000 / liveBpm);
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(beat, {
        toValue: 1.18, duration: period * 0.22, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(beat, {
        toValue: 1, duration: period * 0.78, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
      }),
    ]));
    anim.start();
    return () => { anim.stop(); beat.setValue(1); };
  }, [phase, liveBpm, beat]);

  // --- sample intake -------------------------------------------------------
  // Called from the frame processor's worklet thread, hopped onto JS.
  // `frameMs` is the frame's own capture time, which is what makes the beat
  // intervals trustworthy — but CameraX's timestamp clock is not guaranteed
  // identical across vendors. If the frame spacing comes back implausible for a
  // ~30fps stream, the unit is not what we assumed, so fall back to wall-clock
  // timing for the rest of the session: noisier, but it still produces a
  // reading instead of silently failing every attempt on that device.
  const onSample = useCallback((red, green, blue, frameMs, isMono) => {
    if (phaseRef.current !== 'measuring') return;

    const wallMs = Date.now();
    if (useWallClockRef.current === null && lastFrameMsRef.current !== 0) {
      const delta = Math.abs(frameMs - lastFrameMsRef.current);
      useWallClockRef.current = !(delta > 1 && delta < 500);
    }
    lastFrameMsRef.current = frameMs;
    const timestamp = useWallClockRef.current ? wallMs : frameMs;

    const present = isFingerPresent({ red, green, blue, mono: isMono });
    setFingerOn(present);

    if (!present) {
      // Only discard the buffer once the finger has genuinely been off for a
      // moment — otherwise a single noisy frame throws away a good 15s read.
      if (timestamp - lastGoodRef.current > LOST_GRACE_MS) {
        samplesRef.current = [];
        startedAtRef.current = timestamp;
        setLiveBpm(null);
      }
      return;
    }

    lastGoodRef.current = timestamp;
    if (!startedAtRef.current) startedAtRef.current = timestamp;
    samplesRef.current.push({ t: timestamp, v: red });
  }, []);

  // Raw channel means from the most recent frame. Shown on screen while
  // measuring: if the torch fails to light, every value sits near zero and the
  // cause is obvious at a glance rather than needing a logcat trace.
  const onFormat = useCallback((pixelFormat, width, height) => {
    setFormatInfo(`${pixelFormat} ${width}x${height}`);
  }, []);

  const onDebug = useCallback((red, green, blue) => {
    setDebug({ red: Math.round(red), green: Math.round(green), blue: Math.round(blue) });
    setFrameCount(c => c + 1);
  }, []);

  const onSampleJs = useMemo(() => Worklets.createRunOnJS(onSample), [onSample]);
  const onDebugJs = useMemo(() => Worklets.createRunOnJS(onDebug), [onDebug]);
  const onFormatJs = useMemo(() => Worklets.createRunOnJS(onFormat), [onFormat]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    // A heartbeat tops out around 4Hz, so 15fps is still nearly 4x the rate
    // needed to resolve it. The resample step regrids to a uniform clock
    // regardless of capture rate, so this costs accuracy nothing and halves the
    // per-second pixel work that was cooking the phone.
    runAtTargetFps(15, () => {
      'worklet';
      // Reported before any early return, so a frame that gets rejected still
      // says why.
      const width = frame.width;
      const height = frame.height;
      onFormatJs(String(frame.pixelFormat), width, height);

      if (frame.pixelFormat !== 'rgb') return;

      const data = new Uint8Array(frame.toArrayBuffer());
      // RGB conversion may hand back 3- or 4-byte pixels depending on device;
      // deriving the stride from the buffer length covers both.
      const channels = Math.round(data.length / (width * height));
      onFormatJs(
        String(frame.pixelFormat) + ' len=' + String(data.length) + ' ch=' + String(channels),
        width,
        height
      );
      // A 1-byte-per-pixel buffer is the luma plane, which is usable. Anything
      // narrower than that is not a frame we can read.
      if (channels < 1) return;

      // Average a centred crop only. The frame edges pick up light leaking
      // around the fingertip, which adds a DC offset that swamps the pulse.
      const x0 = Math.floor(width * 0.35);
      const x1 = Math.floor(width * 0.65);
      const y0 = Math.floor(height * 0.35);
      const y1 = Math.floor(height * 0.65);
      // Every 4th pixel in both axes: still thousands of samples per frame, so
      // the mean is just as stable at a sixteenth of the work.
      const stride = 4;

      let r = 0, g = 0, b = 0, n = 0;
      for (let y = y0; y < y1; y += stride) {
        const row = y * width * channels;
        for (let x = x0; x < x1; x += stride) {
          const i = row + x * channels;
          r += data[i];
          if (channels >= 3) {
            g += data[i + 1];
            b += data[i + 2];
          }
          n++;
        }
      }
      if (n === 0) return;

      const isMono = channels < 3;
      onSampleJs(r / n, g / n, b / n, frame.timestamp / 1e6, isMono); // ns -> ms
      onDebugJs(r / n, g / n, b / n);
    });
  }, [onSampleJs, onDebugJs, onFormatJs]);

  // The trace redraws faster than the BPM estimate updates. The estimate only
  // needs to converge; the trace is animation, and at the estimate's 4fps it
  // looked like it was stuttering rather than flowing.
  useEffect(() => {
    if (phase !== 'measuring') return;
    const id = setInterval(() => {
      const samples = samplesRef.current;
      if (samples.length < 12) {
        setWave([]);
        return;
      }
      const endT = samples[samples.length - 1].t;
      const recent = samples.filter(s => s.t >= endT - WAVE_WINDOW_MS);
      if (recent.length < 12) {
        setWave([]);
        return;
      }
      const { values } = resample(recent);
      setWave(bandpass(values));
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  // --- measurement lifecycle ----------------------------------------------
  useEffect(() => {
    if (phase !== 'measuring') return;
    const id = setInterval(() => {
      const samples = samplesRef.current;
      const elapsed = samples.length > 1
        ? samples[samples.length - 1].t - samples[0].t
        : 0;
      setProgress(Math.min(1, elapsed / MEASURE_MS));

      // A partial estimate as soon as there is enough signal, so the number
      // settles in front of the user instead of appearing from nowhere.
      if (elapsed / 1000 >= MIN_SECONDS) {
        const partial = estimateHeartRate(samples);
        if (partial.bpm) setLiveBpm(partial.bpm);
      }

      if (elapsed >= MEASURE_MS) {
        const final = estimateHeartRate(samples);
        if (final.bpm && final.confidence >= MIN_CONFIDENCE) {
          setResult(final);
          setPhase('done');
          notifySuccess();
        } else {
          setError(
            'Could not get a clean reading. Rest your hand on a table, cover the '
            + 'lens and flash completely, and press gently — hard pressure cuts '
            + 'off the blood flow the sensor is looking for.'
          );
          setPhase('error');
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    setLiveBpm(null);
    setProgress(0);
    setFingerOn(false);
    setTorchReady(false);
    setDebug(null);
    setFormatInfo(null);
    setFrameCount(0);
    setWave([]);
    samplesRef.current = [];
    startedAtRef.current = 0;
    lastGoodRef.current = 0;
    useWallClockRef.current = null;
    lastFrameMsRef.current = 0;

    // The torch is not optional here: the measurement is literally the light
    // the flash pushes through the fingertip. Checking up front turns what was
    // a raw VisionCamera FlashUnavailableError — backticked API names and all —
    // into something a user can act on.
    if (!device?.hasTorch) {
      setError(
        "This phone's rear camera doesn't have a flash, so it can't read your "
        + 'pulse this way.'
      );
      setPhase('error');
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        setError('Camera access is needed to read your pulse.');
        setPhase('error');
        return;
      }
    }
    tapLight();
    setPhase('measuring');
  }, [hasPermission, requestPermission, device]);

  const stop = useCallback(() => {
    setPhase('idle');
    setProgress(0);
    setLiveBpm(null);
    samplesRef.current = [];
  }, []);

  const measuring = phase === 'measuring';
  const hasValue = (result?.bpm ?? liveBpm) != null;
  const secondsLeft = Math.ceil((MEASURE_MS * (1 - progress)) / 1000);

  let statusLine;
  if (!measuring) statusLine = null;
  else if (!fingerOn) statusLine = 'Cover the camera and flash with your fingertip';
  else if (!liveBpm) statusLine = 'Hold still — reading your pulse…';
  else statusLine = `Keep holding… ${secondsLeft}s left`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <GradientBackground>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Entrance preset="up" delay={30}>
            <View style={styles.header}>
              <PressableScale
                style={styles.backBtn}
                scale={0.9}
                haptic="light"
                onPress={() => navigation.goBack()}
              >
                <LineIcon name="chevron-left" size={20} color={colors.text} strokeWidth={1.9} />
              </PressableScale>
              <AppText style={styles.title}>Heart Rate</AppText>
              <View style={styles.backBtn} />
            </View>
          </Entrance>

          <Entrance preset="up" delay={60}>
            <GlassCard radius={radius.xl} padding={spacing.xl} style={styles.mainCard}>
                  {/* A real, visible preview surface. See styles.cameraPreview for
                      why this is not hidden. */}
              {device && measuring && (
                    <View style={styles.cameraPreview}>
                      <Camera
                        style={StyleSheet.absoluteFill}
                device={device}
                format={format}
                isActive
                // Torch is deliberately off for the first frames and flipped on
                // only once the session reports initialized. Setting it at mount was
                // silently dropped by this HAL — the camera streamed happily while
                // the flash HAL logged setControlLed(0) on every frame — so what the
                // device needs is a real off->on transition after configuration
                // completes, not a value present from the start.
                torch={torchReady ? 'on' : 'off'}
                onInitialized={() => setTorchReady(true)}
                pixelFormat="rgb"
                frameProcessor={frameProcessor}
                onError={(e) => {
                  // e.message is written for developers; don't put it in front of
                  // a user. The code is enough to say something useful.
                  setError(
                    e.code === 'device/flash-unavailable'
                      ? "This phone's rear camera doesn't have a flash, so it can't "
                        + 'read your pulse this way.'
                      : 'The camera could not be started. Close any other app that '
                        + 'might be using it and try again.'
                  );
                  setPhase('error');
                }}
                  />
                </View>
              )}

              <Animated.View style={[styles.heartWrap, { transform: [{ scale: beat }] }]}>
                <LineIcon
                  name="heart"
                  size={64}
                  color={measuring && fingerOn ? colors.primary : colors.mutedDark}
                  strokeWidth={1.5}
                />
              </Animated.View>

              {/* The placeholder is muted: in the display face at 64px a pair of
                  hyphens renders as two solid bars, which read as a broken
                  value rather than as "nothing measured yet". */}
              <AppText style={[styles.bpm, !hasValue && styles.bpmPlaceholder]}>
                {hasValue ? (result?.bpm ?? liveBpm) : '--'}
              </AppText>
              <AppText style={styles.bpmUnit}>BPM</AppText>

              {measuring && (
                <PulseWave data={wave} width={260} height={64} />
              )}

              {measuring && (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 2)}%` }]} />
                </View>
              )}

              {statusLine && <AppText style={styles.status}>{statusLine}</AppText>}

              {measuring && (
                <AppText style={styles.debug}>
                  {`fmt ${formatInfo ?? 'none'}
`}
                  {debug
                    ? `R ${debug.red}  G ${debug.green}  B ${debug.blue}  ·  ${frameCount} frames  ·  torch ${torchReady ? 'ready' : 'pending'}`
                    : 'no frames received yet'}
                </AppText>
              )}

              {phase === 'done' && result && (
                <AppText style={styles.status}>
                  {result.beats} beats over {Math.round(result.seconds)}s
                  {result.confidence < 0.6 ? ' · weak signal, retake for a better reading' : ''}
                </AppText>
              )}

              {phase === 'error' && (
                <AppText style={[styles.status, { color: colors.danger }]}>{error}</AppText>
              )}

              <View style={styles.actions}>
                {measuring ? (
                  <Button label="Cancel" variant="ghost" full onPress={stop} />
                ) : (
                  <Button
                    label={phase === 'idle' ? 'Start measuring' : 'Measure again'}
                    icon="pulse"
                    full
                    onPress={start}
                  />
                )}
              </View>
            </GlassCard>
          </Entrance>

          {!measuring && (
            <Entrance preset="up" delay={90}>
              <GlassCard radius={radius.lg} padding={spacing.lg} style={styles.tips}>
                <AppText weight="semibold" style={styles.tipsTitle}>How to measure</AppText>
                {[
                  'Cover both the rear camera and the flash with the pad of your index finger.',
                  'Press gently — firm pressure squeezes the blood out of your fingertip and flattens the signal.',
                  'Rest your hand on a table and stay still for about 20 seconds.',
                ].map((t) => (
                  <View key={t} style={styles.tipRow}>
                    <View style={styles.bullet} />
                    <AppText style={styles.tipText}>{t}</AppText>
                  </View>
                ))}
                <AppText style={styles.disclaimer}>
                  This is a wellness estimate from your phone camera, not a medical
                  device. Don&apos;t use it to diagnose or treat any condition.
                </AppText>
              </GlassCard>
            </Entrance>
          )}

          {!device && (
            <AppText style={[styles.status, { color: colors.danger }]}>
              No rear camera available on this device.
            </AppText>
          )}

          {error && !hasPermission && phase === 'error' && (
            <Button
              label="Open settings"
              variant="ghost"
              onPress={() => Linking.openSettings()}
              style={{ marginTop: spacing.lg }}
            />
          )}
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  container: { padding: spacing.xl, paddingBottom: spacing.xxl },

  // The camera is rendered small but genuinely visible. A 1x1 opacity-0 view
  // streamed frames fine, but this Oppo/oplus HAL would not hold the torch for
  // it — enableTorch() was called and silently ignored. A real, laid-out,
  // non-transparent preview surface is what makes the flash stay lit.
  //
  // It earns its place in the UI too: the user can see whether their fingertip
  // is actually covering the lens instead of guessing.
  cameraPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  title: { ...type.title, color: colors.text },

  mainCard: { alignItems: 'center', marginBottom: spacing.xl },
  heartWrap: { marginBottom: spacing.md },
  bpm: {
    fontFamily: fonts.displayExtra,
    fontSize: 64,
    lineHeight: 70,
    letterSpacing: -2,
    color: colors.text,
  },
  bpmPlaceholder: { color: colors.mutedDark },
  bpmUnit: {
    ...type.label,
    color: colors.muted,
    letterSpacing: 1.5,
    marginTop: -4,
  },

  progressTrack: {
    height: 6,
    width: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  progressFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },

  status: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 19,
  },
  debug: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actions: { marginTop: spacing.xl, alignSelf: 'stretch' },

  tips: { marginBottom: spacing.lg },
  tipsTitle: { ...type.section, color: colors.text, marginBottom: spacing.md },
  tipRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bullet: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 7, marginRight: spacing.md,
  },
  tipText: { ...type.body, color: colors.textSecondary, flex: 1, lineHeight: 19 },
  disclaimer: {
    ...type.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.md,
    lineHeight: 17,
  },
});
