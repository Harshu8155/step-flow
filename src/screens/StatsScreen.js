import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, SafeAreaView, StatusBar, Animated, Easing,
} from 'react-native';
import Svg, { Polyline, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { spacing, radius, fonts, type, TAB_BAR_CLEARANCE } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import {
  SectionHeader, GradientBackground, GlassCard, Entrance, LineIcon, AppText,
  PressableScale, stagger, SegmentedControl,
} from '../components';
import { useSteps } from '../utils/StepContext';
import useRefreshControl from '../utils/useRefreshControl';

const TABS = ['Week', 'Month', 'Year'];
const DAILY_GOAL = 10000;

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

function buildHeatmapIntensities(dailySteps, year) {
  const rows = 3, cols = 12;
  const buckets = Array.from({ length: rows * cols }, () => ({ sum: 0, count: 0 }));
  for (const [key, steps] of Object.entries(dailySteps)) {
    const d = new Date(key + 'T00:00:00');
    if (d.getFullYear() !== year) continue;
    const month = d.getMonth();
    const day = d.getDate();
    const row = day <= 10 ? 0 : day <= 20 ? 1 : 2;
    buckets[row * cols + month].sum += steps;
    buckets[row * cols + month].count += 1;
  }
  return buckets.map(b => (b.count ? Math.min(b.sum / b.count / DAILY_GOAL, 1) : 0));
}

const LINE_CHART_W = 320;
const LINE_CHART_H = 100;

// Animated line chart: stroke draws in, dots pop along the path in sequence.
function LineChart({
  data,
  replayKey,
  width = LINE_CHART_W,
  height = LINE_CHART_H,
}) {
  const { colors } = useTheme();

  const activeData = data.filter(d => d.avg > 0);

  const draw = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([]);

  const max = activeData.length
    ? Math.max(...activeData.map(d => d.avg))
    : 1;

  const min = activeData.length
    ? Math.min(...activeData.map(d => d.avg))
    : 0;

  const range = max - min || 1;

  const coords = activeData.map((d, i) => {
    const x =
      (i / Math.max(activeData.length - 1, 1)) *
        (width - 20) +
      10;

    const y =
      height -
      20 -
      ((d.avg - min) / range) *
        (height - 40);

    return [x, y];
  });

  let pathLen = 0;

  for (let i = 1; i < coords.length; i++) {
    pathLen += Math.hypot(
      coords[i][0] - coords[i - 1][0],
      coords[i][1] - coords[i - 1][1]
    );
  }

  if (dotAnims.current.length !== coords.length) {
    dotAnims.current = coords.map(
      () => new Animated.Value(0)
    );
  }

  useEffect(() => {
    if (activeData.length < 2) return;

    draw.stopAnimation();
    draw.setValue(pathLen);

    dotAnims.current.forEach(anim => {
      anim.stopAnimation();
      anim.setValue(0);
    });

    // LINE ANIMATION
    Animated.timing(draw, {
      toValue: 0,
      duration: 1100,
      delay: 100,
      easing: Easing.bezier(0.4, 0, 0.2, 1),

      // IMPORTANT:
      // strokeDashoffset cannot use the native driver reliably.
      useNativeDriver: false,
    }).start();

    // DOT ANIMATIONS
    coords.forEach((_, i) => {
      const delay =
        150 +
        900 *
          (i / Math.max(coords.length - 1, 1));

      Animated.timing(dotAnims.current[i], {
        toValue: 1,
        duration: 300,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  }, [replayKey, pathLen]);

  if (activeData.length < 2) {
    return null;
  }

  const last = coords[coords.length - 1];

  return (
    <Svg width={width} height={height}>

      {/* Animated line */}
      <AnimatedPolyline
        points={coords
          .map(p => p.join(','))
          .join(' ')}
        fill="none"
        stroke={colors.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"

        // Use TWO values so the entire line can be
        // revealed correctly.
        strokeDasharray={`${pathLen} ${pathLen}`}
        strokeDashoffset={draw}
      />

      {/* Animated dots */}
      {coords.map((p, i) => (
        <AnimatedCircle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r={3}
          fill={colors.surface}
          stroke={colors.primary}
          strokeWidth={1.5}
          opacity={dotAnims.current[i]}
        />
      ))}

      {/* Last point */}
      <AnimatedCircle
        cx={last[0]}
        cy={last[1]}
        r={5}
        fill={colors.accent}
        opacity={dotAnims.current[coords.length - 1]}
      />

      {/* X-axis labels */}
      {coords.map((p, i) => (
        <SvgText
          key={`t${i}`}
          x={p[0]}
          y={height - 4}
          fontSize={9}
          fill={colors.muted}
          textAnchor="middle"
        >
          {activeData[i].month}
        </SvgText>
      ))}

    </Svg>
  );
}

// Animated heatmap: cells pop in column by column.
function HeatCell({ future, alpha, color, delay }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 320, delay, easing: Easing.bezier(0.22, 0.61, 0.36, 1), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[styles.heatCell, { backgroundColor: color, opacity: t, transform: [{ scale: t }] }]} />
  );
}

function Heatmap({ intensities, currentMonthIndex, colors }) {
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const rows = 3, cols = 12;
  return (
    <View>
      <View style={styles.heatmapMonths}>
        {months.map((m, i) => <AppText key={i} style={[styles.heatmapMonth, { color: colors.muted }]}>{m}</AppText>)}
      </View>
      {Array.from({ length: rows }).map((_, row) => (
        <View key={row} style={styles.heatmapRow}>
          {Array.from({ length: cols }).map((_, col) => {
            const intensity = intensities[row * cols + col] || 0;
            const future = col > currentMonthIndex;
            const alpha = future ? 0.08 : Math.max(intensity, intensity > 0 ? 0.15 : 0);
            return (
              <HeatCell key={col} future={future} alpha={alpha}
                color={future ? colors.surface2 : `rgba(${colors.primaryRgb}, ${alpha})`}
                delay={80 + stagger(col * 3 + row, 30, 6)} />
            );
          })}
        </View>
      ))}
      <View style={styles.heatmapLegend}>
        <AppText style={[styles.legendText2, { color: colors.muted }]}>Less</AppText>
        {[0.1, 0.3, 0.6, 1.0].map((v, i) => <View key={i} style={[styles.legendCell, { backgroundColor: `rgba(${colors.primaryRgb}, ${v})` }]} />)}
        <AppText style={[styles.legendText2, { color: colors.muted }]}>More</AppText>
      </View>
    </View>
  );
}

function formatDistance(totalSteps, unit) {
  const isImperial = unit === 'Imperial';
  const multiplier = isImperial ? 0.0004736 : 0.000762;
  return `${(totalSteps * multiplier).toFixed(1)} ${isImperial ? 'mi' : 'km'}`;
}
function formatCalories(totalSteps) { return Math.round(totalSteps * 0.04).toLocaleString(); }
function formatBigNumber(n) { return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : n.toLocaleString(); }
function formatRecordDate(key) { if (!key) return '—'; return new Date(key + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function formatRecordMonth(monthKey) { if (!monthKey) return '—'; const [y, m] = monthKey.split('-'); return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }

function buildDailyTrend(dailySteps, year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
  const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;
  const points = [];
  for (let day = 1; day <= lastDay; day++) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    points.push({ month: String(day), avg: dailySteps[key] || 0 });
  }
  return points;
}

export default function StatsScreen() {
  const [tab, setTab] = useState(2);
  const { colors, isDark } = useTheme();
  const scopedStyles = useMemo(() => createStyles(colors), [colors]);
  const { refreshControl } = useRefreshControl();
  const {
    weeklyStats, monthlyTrend, monthlyStats, yearlyStats, records, dailySteps, unit,
  } = useSteps();

  const year = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();

  const dynamicWeeklyStats = {
    totalSteps: weeklyStats.total.toLocaleString(), avgDay: weeklyStats.avg.toLocaleString(),
    bestDay: weeklyStats.best.toLocaleString(), goalDays: `${weeklyStats.goalDays} / 7`,
    distance: formatDistance(weeklyStats.total, unit), calories: formatCalories(weeklyStats.total),
  };
  const daysInMonth = new Date(year, currentMonthIndex + 1, 0).getDate();
  const dynamicMonthlyStats = {
    totalSteps: monthlyStats.total.toLocaleString(), avgDay: monthlyStats.avg.toLocaleString(),
    bestDay: monthlyStats.best.toLocaleString(), goalDays: `${monthlyStats.goalDays} / ${daysInMonth}`,
    distance: formatDistance(monthlyStats.total, unit), calories: formatCalories(monthlyStats.total),
  };
  const dynamicYearlyStats = {
    totalSteps: formatBigNumber(yearlyStats.total), avgDay: yearlyStats.avg.toLocaleString(),
    bestDay: yearlyStats.best.toLocaleString(), goalDays: `${yearlyStats.goalDays} days`,
    distance: formatDistance(yearlyStats.total, unit), calories: formatCalories(yearlyStats.total),
  };
  const stats = tab === 0 ? dynamicWeeklyStats : tab === 1 ? dynamicMonthlyStats : dynamicYearlyStats;

  const monthlyDailyTrend = useMemo(() => buildDailyTrend(dailySteps, year, currentMonthIndex), [dailySteps, year, currentMonthIndex]);
  const chartData = tab === 1 ? monthlyDailyTrend : monthlyTrend;
  const heatmapIntensities = buildHeatmapIntensities(dailySteps, year);

  // Unified color hierarchy: neutral values, accent only for state-y metrics.
  const gridCells = [
    { label: 'Total steps', value: stats.totalSteps, color: colors.text },
    { label: 'Daily avg', value: stats.avgDay, color: colors.text },
    { label: 'Best day', value: stats.bestDay, color: colors.primary },
    { label: 'Goal hit', value: stats.goalDays, color: colors.success },
    { label: 'Distance', value: stats.distance, color: colors.text },
    { label: 'Calories', value: stats.calories, color: colors.text },
  ];

  return (
    <SafeAreaView style={scopedStyles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <GradientBackground>
        <ScrollView style={scopedStyles.scroll} contentContainerStyle={scopedStyles.container} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>

          <SegmentedControl
            options={TABS}
            value={tab}
            onChange={setTab}
            style={scopedStyles.tabs}
          />

          {/* keyed on tab so the stagger replays on Week/Month/Year switch */}
          <View key={tab}>
            <Entrance preset="up" delay={30} trigger={tab}>
              <View style={scopedStyles.statsGrid}>
                {gridCells.map((s, i) => (
                  <GlassCard key={i} radius={radius.md} padding={spacing.md} style={scopedStyles.statCard}>
                    <AppText style={scopedStyles.statLabel}>{s.label}</AppText>
                    <AppText weight="semibold" style={[scopedStyles.statValue, { color: s.color }]}>{s.value}</AppText>
                  </GlassCard>
                ))}
              </View>
            </Entrance>

            {tab === 2 && (
              <Entrance preset="up" delay={70} trigger={tab}>
                <GlassCard style={scopedStyles.card}>
                  <SectionHeader title={`Activity heatmap · ${year}`} />
                  <Heatmap intensities={heatmapIntensities} currentMonthIndex={currentMonthIndex} colors={colors} />
                </GlassCard>
              </Entrance>
            )}

            {tab !== 0 && (
              <Entrance preset="up" delay={110} trigger={tab}>
                <GlassCard style={scopedStyles.card}>
                  <SectionHeader title={tab === 1 ? 'Daily trend this month' : `Monthly trend · ${year}`} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart data={chartData} replayKey={tab} />
                  </ScrollView>
                </GlassCard>
              </Entrance>
            )}

            <Entrance preset="up" delay={150} trigger={tab}>
              <GlassCard style={scopedStyles.card}>
                <SectionHeader title="Personal records" />
                {[
                  { label: 'Most steps in a day', value: records.bestDay ? records.bestDay.steps.toLocaleString() : '—', date: formatRecordDate(records.bestDay?.date) },
                  { label: 'Longest streak', value: `${records.longestStreak} day${records.longestStreak === 1 ? '' : 's'}`, date: records.longestStreak > 0 ? 'goal days in a row' : '—' },
                  { label: 'Best month', value: records.bestMonthTotal ? records.bestMonthTotal.toLocaleString() : '—', date: formatRecordMonth(records.bestMonthLabel) },
                ].map((r, i) => (
                  <View key={i} style={scopedStyles.recordRow}>
                    <View style={scopedStyles.recordIcon}>
                      <LineIcon name="trophy" size={18} color={colors.goal} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText weight="medium" style={scopedStyles.recordLabel}>{r.label}</AppText>
                      <AppText style={scopedStyles.recordDate}>{r.date}</AppText>
                    </View>
                    <AppText weight="semibold" style={scopedStyles.recordValue}>{r.value}</AppText>
                  </View>
                ))}
              </GlassCard>
            </Entrance>
          </View>

        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

// Shared (non-theme) styles for chart internals.
const styles = StyleSheet.create({
  heatmapMonths: { flexDirection: 'row', marginBottom: 4 },
  heatmapMonth: { flex: 1, fontSize: 9, textAlign: 'center' },
  heatmapRow: { flexDirection: 'row', gap: 3, marginBottom: 3 },
  heatCell: { flex: 1, height: 18, borderRadius: 3 },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' },
  legendCell: { width: 12, height: 12, borderRadius: 2 },
  legendText2: { fontSize: 10 },
});

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE },
  tabs: { marginBottom: spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { width: '47%' },
  statLabel: { fontSize: 11, color: colors.muted, marginBottom: 4 },
  statValue: { fontSize: 20 },
  card: { marginBottom: spacing.md },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  recordIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  recordLabel: { fontSize: 13, color: colors.text },
  recordDate: { fontSize: 11, color: colors.muted },
  recordValue: { fontSize: 14, color: colors.accent },
});
