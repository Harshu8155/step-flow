// PPG (photoplethysmography) signal processing for the fingertip heart-rate reader.
//
// The physical idea: with the torch on and a fingertip pressed over the lens, the
// camera sees light that has passed through capillary tissue. Every heartbeat
// pushes a pulse of blood through those capillaries, which absorbs slightly more
// red light — so the mean red channel of the frame dips once per beat. The signal
// is tiny (often under 1% of the DC level) and rides on a much larger drift from
// breathing and from the finger settling against the glass, which is why raw peak
// picking on the mean does not work and the detrending below is not optional.
//
// Everything here is pure and frame-source agnostic: it takes {t, v} samples and
// returns a BPM. That keeps the maths testable without a camera attached.

// A beat cannot plausibly be faster than 200bpm or slower than 35bpm. These bound
// both the peak refractory period and which inter-beat intervals we keep.
const MIN_BPM = 35;
const MAX_BPM = 200;
const MIN_IBI_MS = 60000 / MAX_BPM; // 300ms
const MAX_IBI_MS = 60000 / MIN_BPM; // ~1714ms

// The uniform rate we resample onto before filtering. Frames arrive at roughly
// 30fps but with jitter, and every filter below assumes an even time step.
export const RESAMPLE_HZ = 30;

// How much signal we need before a reading means anything. Below this the IBI
// median is drawn from too few beats to be stable.
export const MIN_SECONDS = 6;
export const TARGET_SECONDS = 15;

/**
 * Resample irregularly-timed samples onto a uniform grid by linear interpolation.
 * Frame callbacks jitter by tens of milliseconds; feeding that straight into a
 * fixed-window filter smears the passband and biases the BPM, so we regrid first.
 */
export function resample(samples, hz = RESAMPLE_HZ) {
  if (samples.length < 2) return { values: [], step: 1000 / hz, t0: 0 };
  const step = 1000 / hz;
  const t0 = samples[0].t;
  const tEnd = samples[samples.length - 1].t;
  const out = [];
  let i = 0;
  for (let t = t0; t <= tEnd; t += step) {
    // Advance to the sample pair straddling t.
    while (i < samples.length - 2 && samples[i + 1].t < t) i++;
    const a = samples[i];
    const b = samples[i + 1];
    const span = b.t - a.t;
    const frac = span > 0 ? (t - a.t) / span : 0;
    out.push(a.v + (b.v - a.v) * frac);
  }
  return { values: out, step, t0 };
}

/** Centred moving average. Window is in samples and forced odd so it stays centred. */
function movingAverage(values, window) {
  const w = Math.max(1, window | 1);
  const half = (w - 1) / 2;
  const out = new Array(values.length).fill(0);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= w) sum -= values[i - w];
    const filled = Math.min(i + 1, w);
    // Shift the result back by `half` so the average is centred, not lagging.
    const target = i - half;
    if (target >= 0) out[target] = sum / filled;
  }
  // The last `half` entries never received a centred value; hold the last real one.
  const lastReal = values.length - half - 1;
  for (let i = Math.max(0, lastReal + 1); i < values.length; i++) {
    out[i] = out[Math.max(0, lastReal)];
  }
  return out;
}

/**
 * Band-pass the pulse out of the raw trace.
 *
 * Implemented as a difference of two moving averages rather than a proper IIR
 * filter: subtracting a long average removes the breathing drift and the DC
 * level, and a short (~0.13s) average removes sensor noise. That leaves roughly
 * the 0.6-4Hz band a heartbeat lives in, at a fraction of the cost and with no
 * risk of the ringing an under-damped IIR would add on a 15-second clip.
 *
 * The long window MUST stay above the slowest beat period we accept (1.71s at
 * 35bpm). A shorter window subtracts away the fundamental itself on a slow pulse
 * and leaves the dicrotic notch as the tallest feature, which reads as roughly
 * 1.6x the true rate — a bradycardic 48bpm came back as 78bpm before this was
 * widened from 0.8s.
 */
export function bandpass(values, hz = RESAMPLE_HZ) {
  if (values.length < 5) return values.slice();
  const slow = movingAverage(values, Math.round(hz * 2.0));
  const detrended = values.map((v, i) => v - slow[i]);
  return movingAverage(detrended, Math.max(3, Math.round(hz * 0.13)));
}

/**
 * Find beat peaks in a filtered trace.
 *
 * Threshold is adaptive (a fraction of the RMS) because absolute amplitude varies
 * hugely with finger pressure and skin tone — a fixed cutoff would find every beat
 * on one person and none on the next. The refractory period stops the dicrotic
 * notch, the small secondary bump in every arterial pulse, being counted as a
 * second beat and reporting double the true rate.
 */
export function findPeaks(values, step) {
  if (values.length < 3) return [];
  let sumSq = 0;
  for (const v of values) sumSq += v * v;
  const rms = Math.sqrt(sumSq / values.length);
  const threshold = rms * 0.5;
  if (!(threshold > 0)) return [];

  const peaks = [];
  let lastPeakIdx = -Infinity;
  for (let i = 1; i < values.length - 1; i++) {
    const v = values[i];
    if (v < threshold) continue;
    if (v < values[i - 1] || v < values[i + 1]) continue;
    if ((i - lastPeakIdx) * step < MIN_IBI_MS) {
      // Too soon after the last peak. If this one is taller it is the real beat
      // and the previous was the noise, so swap rather than simply skipping.
      if (peaks.length && v > values[peaks[peaks.length - 1]]) {
        peaks[peaks.length - 1] = i;
        lastPeakIdx = i;
      }
      continue;
    }
    peaks.push(i);
    lastPeakIdx = i;
  }
  return peaks;
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Turn raw {t, v} PPG samples into a BPM estimate.
 *
 * Returns { bpm, confidence, beats, seconds }. `confidence` is 0-1 and worth
 * surfacing: a fingertip that shifts mid-read still produces peaks and therefore
 * still produces a number, and the only thing distinguishing that number from a
 * real one is how regular the intervals were.
 */
export function estimateHeartRate(samples) {
  const seconds = samples.length > 1
    ? (samples[samples.length - 1].t - samples[0].t) / 1000
    : 0;
  const empty = { bpm: null, confidence: 0, beats: 0, seconds };
  if (seconds < MIN_SECONDS) return empty;

  const { values, step } = resample(samples);
  const filtered = bandpass(values);
  const peaks = findPeaks(filtered, step);
  if (peaks.length < 4) return { ...empty, beats: peaks.length };

  // Inter-beat intervals, keeping only physiologically possible ones.
  const ibis = [];
  for (let i = 1; i < peaks.length; i++) {
    const ibi = (peaks[i] - peaks[i - 1]) * step;
    if (ibi >= MIN_IBI_MS && ibi <= MAX_IBI_MS) ibis.push(ibi);
  }
  if (ibis.length < 3) return { ...empty, beats: peaks.length };

  // Median, not mean: one missed beat merges two intervals into a double-length
  // outlier, which drags a mean badly but leaves a median alone.
  const medianIbi = median(ibis);
  if (!(medianIbi > 0)) return { ...empty, beats: peaks.length };
  const bpm = 60000 / medianIbi;
  if (bpm < MIN_BPM || bpm > MAX_BPM) return { ...empty, beats: peaks.length };

  // Confidence from interval regularity. A real resting pulse varies by a few
  // percent between beats; noise-driven "peaks" scatter far wider.
  const deviations = ibis.map(v => Math.abs(v - medianIbi) / medianIbi);
  const meanDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const regularity = Math.max(0, 1 - meanDeviation * 3);
  // Longer reads are more trustworthy regardless of how tidy a short one looks.
  const duration = Math.min(1, seconds / TARGET_SECONDS);

  // Beats from one heart through one fingertip are all about the same height.
  // Peaks picked out of noise are not, and regularity alone does not catch that:
  // random data happened to score 0.40 on interval spread before this term.
  const heights = peaks.map(i => filtered[i]);
  const meanHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
  let heightVar = 0;
  for (const h of heights) heightVar += (h - meanHeight) ** 2;
  const heightCv = meanHeight > 0
    ? Math.sqrt(heightVar / heights.length) / meanHeight
    : 1;
  const uniformity = Math.max(0, 1 - heightCv * 2);

  return {
    bpm: Math.round(bpm),
    confidence: Math.max(0, Math.min(1,
      regularity * 0.45 + uniformity * 0.3 + duration * 0.25
    )),
    beats: peaks.length,
    seconds,
  };
}

/**
 * Is a fingertip actually covering the lens?
 *
 * With the torch on and skin against the glass the frame goes bright red and
 * nearly uniform. An uncovered lens sees a much more balanced, more varied scene.
 * Checking this matters because the filters above will happily manufacture peaks
 * out of the noise in a picture of the ceiling and report a confident 72bpm.
 */
export function isFingerPresent({ red, green, blue, mono = false }) {
  // Some devices hand back a single-plane luma buffer even when the frame
  // reports pixelFormat 'rgb', so colour balance is not observable there and
  // brightness is the only usable signal. Luma still carries the pulse — it is
  // a weighted mix that includes red, and under the torch the scene is
  // overwhelmingly red anyway.
  if (mono) return red >= 30;

  if (red < 60) return false;            // too dark: no torch, or a gap at the edge
  if (red < green * 1.4) return false;   // skin over a torch is decisively red-dominant
  if (red < blue * 1.4) return false;
  return true;
}
