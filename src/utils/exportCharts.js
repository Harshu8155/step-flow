// Chart geometry for the export, shared by the on-screen preview and the PDF.
//
// The preview renders with react-native-svg; the PDF is an HTML string handed to
// expo-print, so it needs literal <svg> markup instead of components. Computing
// the geometry in one place is what keeps ExportScreen's promise that the file
// matches what you saw — if the maths lived twice, the two would drift.
//
// Nothing here imports React or react-native, so both callers can use it.

/**
 * Turn export rows into a left-to-right series, bucketing when there are more
 * days than bars will fit.
 *
 * `rows` arrive newest-first (that's the order the table wants); charts read
 * oldest-to-newest, so this reverses them.
 *
 * Over a long range, one bar per day would be a sliver — so days are averaged
 * into at most `maxBars` buckets. `bucketDays` reports how many days each bar
 * covers, which the caption uses so an averaged chart never claims to be daily.
 */
export function buildSeries(rows, maxBars = 31) {
  const chron = [...rows].reverse();
  if (chron.length === 0) return { points: [], bucketDays: 1 };

  if (chron.length <= maxBars) {
    return {
      points: chron.map(r => ({ label: shortDay(r.key), value: r.steps, metGoal: r.metGoal })),
      bucketDays: 1,
    };
  }

  const bucketDays = Math.ceil(chron.length / maxBars);
  const points = [];
  for (let i = 0; i < chron.length; i += bucketDays) {
    const slice = chron.slice(i, i + bucketDays);
    const avg = Math.round(slice.reduce((s, r) => s + r.steps, 0) / slice.length);
    points.push({
      label: shortDay(slice[0].key),
      value: avg,
      // A bucket counts as met only if its average cleared the goal.
      metGoal: slice.every(r => r.metGoal),
    });
  }
  return { points, bucketDays };
}

function shortDay(key) {
  // key is "yyyy-MM-dd"; the day number alone is all that fits under a bar.
  return String(Number(key.slice(8, 10)));
}

/**
 * Lay out the bars. Returns plain numbers so either renderer can draw them.
 *
 * The scale spans the tallest bar AND the goal, so a range spent entirely below
 * target still shows how far below — rather than rescaling until a bad week
 * looks identical to a good one.
 *
 * `goalY` is null only when no goal was supplied.
 */
export function barGeometry(points, { width, height, goal, gap = 3, bottomPad = 16 }) {
  const plotH = height - bottomPad;
  // 8% headroom. Without it, whichever is larger sits flush against the top —
  // and when that's the goal, its label draws above y=0 and is clipped away.
  const max = Math.max(...points.map(p => p.value), goal || 0, 1) * 1.08;
  const n = points.length || 1;
  const barW = Math.max((width - gap * (n - 1)) / n, 1);

  const bars = points.map((p, i) => {
    const h = Math.max((p.value / max) * plotH, p.value > 0 ? 2 : 0);
    return {
      x: i * (barW + gap),
      y: plotH - h,
      w: barW,
      h,
      value: p.value,
      label: p.label,
      metGoal: p.metGoal,
    };
  });

  const goalY = goal ? plotH - (goal / max) * plotH : null;
  return { bars, goalY, max, plotH, barW };
}

/**
 * Donut geometry for "days the goal was met". Returns the dash values an SVG
 * circle needs, so both renderers draw the identical arc.
 */
export function donutGeometry({ value, total, size = 96, stroke = 12 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  return {
    r,
    cx: size / 2,
    cy: size / 2,
    circumference: c,
    dashoffset: c * (1 - pct),
    pct: Math.round(pct * 100),
  };
}

/**
 * The same two charts as standalone SVG markup for the PDF.
 * `palette` keeps the colours in the caller's hands so the PDF matches the app.
 */
export function chartsToSvg({ points, goal, goalDays, totalDays, palette, bucketDays }) {
  const W = 720;
  const H = 180;
  const { bars, goalY, plotH } = barGeometry(points, { width: W, height: H, goal, gap: 4 });

  // Label every bar when they're sparse, otherwise thin them out so the axis
  // doesn't turn into a smear of overlapping numbers.
  const labelEvery = Math.ceil(bars.length / 16);

  const barMarkup = bars.map((b, i) => `
      <rect x="${round(b.x)}" y="${round(b.y)}" width="${round(b.w)}" height="${round(b.h)}"
            rx="2" fill="${b.metGoal ? palette.accent : palette.bar}" />
      ${i % labelEvery === 0
        ? `<text x="${round(b.x + b.w / 2)}" y="${H - 3}" font-size="8" fill="${palette.muted}" text-anchor="middle">${b.label}</text>`
        : ''}`).join('');

  const goalLine = goalY === null ? '' : `
      <line x1="0" y1="${round(goalY)}" x2="${W}" y2="${round(goalY)}"
            stroke="${palette.accent}" stroke-width="1" stroke-dasharray="4 4" opacity="0.6" />
      <text x="${W - 2}" y="${round(goalY) - 4}" font-size="8" fill="${palette.muted}" text-anchor="end">goal ${goal.toLocaleString()}</text>`;

  const d = donutGeometry({ value: goalDays, total: totalDays, size: 120, stroke: 14 });

  return `
    <div class="chart">
      <div class="chart-title">Steps per ${bucketDays > 1 ? `${bucketDays} days (average)` : 'day'}</div>
      <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="${plotH}" x2="${W}" y2="${plotH}" stroke="${palette.grid}" stroke-width="1" />
        ${goalLine}
        ${barMarkup}
      </svg>
    </div>

    <div class="chart">
      <div class="chart-title">Goal days</div>
      <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${d.cx}" cy="${d.cy}" r="${round(d.r)}" fill="none"
                stroke="${palette.grid}" stroke-width="14" />
        <circle cx="${d.cx}" cy="${d.cy}" r="${round(d.r)}" fill="none"
                stroke="${palette.accent}" stroke-width="14" stroke-linecap="round"
                stroke-dasharray="${round(d.circumference)}"
                stroke-dashoffset="${round(d.dashoffset)}"
                transform="rotate(-90 ${d.cx} ${d.cy})" />
        <text x="60" y="65" font-size="22" font-weight="700" fill="${palette.text}" text-anchor="middle">${d.pct}%</text>
      </svg>
      <div class="chart-note">${goalDays} of ${totalDays} days met the ${goal.toLocaleString()} step goal</div>
    </div>`;
}

const round = (n) => Math.round(n * 100) / 100;
