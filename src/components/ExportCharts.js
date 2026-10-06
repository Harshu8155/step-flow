// ExportCharts — the on-screen half of the export preview's graphs.
//
// The geometry comes from utils/exportCharts, the same module that builds the
// PDF's SVG, so the preview and the file cannot drift apart. This file only
// turns those numbers into react-native-svg elements.
import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle, Text as SvgText } from 'react-native-svg';
import { AppText } from './AppText';
import GlassCard from './GlassCard';
import { spacing, radius, fonts } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { buildSeries, barGeometry, donutGeometry } from '../utils/exportCharts';

const CHART_H = 140;

export default function ExportCharts({ rows, goal, goalDays }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // The bar chart spans the card, whose width isn't known until layout.
  const [width, setWidth] = useState(0);

  const { points, bucketDays } = useMemo(() => buildSeries(rows), [rows]);

  if (points.length === 0) return null;

  const geo = width > 0
    ? barGeometry(points, { width, height: CHART_H, goal, gap: 3 })
    : null;

  // Thin the axis labels so they don't overlap on a long range.
  const labelEvery = Math.ceil(points.length / 10);
  const donut = donutGeometry({ value: goalDays, total: rows.length, size: 104, stroke: 12 });

  return (
    <>
      <GlassCard style={styles.card}>
        <AppText weight="semibold" style={styles.title}>
          Steps per {bucketDays > 1 ? `${bucketDays} days` : 'day'}
        </AppText>
        {bucketDays > 1 && (
          // Never let an averaged chart imply it is showing individual days.
          <AppText style={styles.note}>Averaged — the range is longer than the chart has bars.</AppText>
        )}

        <View style={{ height: CHART_H }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {geo && (
            <Svg width={width} height={CHART_H}>
              <Line x1={0} y1={geo.plotH} x2={width} y2={geo.plotH} stroke={colors.border} strokeWidth={1} />
              {geo.goalY !== null && (
                <Line
                  x1={0} y1={geo.goalY} x2={width} y2={geo.goalY}
                  stroke={colors.primary} strokeWidth={1}
                  strokeDasharray="4 4" opacity={0.6}
                />
              )}
              {geo.bars.map((b, i) => (
                <Rect
                  key={i}
                  x={b.x} y={b.y} width={b.w} height={b.h} rx={2}
                  fill={b.metGoal ? colors.primary : colors.accent}
                  opacity={b.value === 0 ? 0.15 : b.metGoal ? 1 : 0.75}
                />
              ))}
              {geo.bars.map((b, i) => (
                i % labelEvery === 0 ? (
                  <SvgText
                    key={`l${i}`}
                    x={b.x + b.w / 2} y={CHART_H - 3}
                    fontSize={9} fill={colors.muted} textAnchor="middle"
                  >
                    {b.label}
                  </SvgText>
                ) : null
              ))}
            </Svg>
          )}
        </View>

        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: colors.primary }]} />
          <AppText style={styles.legendText}>Goal met</AppText>
          <View style={[styles.swatch, { backgroundColor: colors.accent, opacity: 0.75, marginLeft: spacing.md }]} />
          <AppText style={styles.legendText}>Below goal</AppText>
        </View>
      </GlassCard>

      <GlassCard style={styles.card}>
        <AppText weight="semibold" style={styles.title}>Goal days</AppText>
        <View style={styles.donutRow}>
          <Svg width={104} height={104}>
            <Circle
              cx={donut.cx} cy={donut.cy} r={donut.r}
              fill="none" stroke={colors.surface2} strokeWidth={12}
            />
            <Circle
              cx={donut.cx} cy={donut.cy} r={donut.r}
              fill="none" stroke={colors.primary} strokeWidth={12} strokeLinecap="round"
              strokeDasharray={donut.circumference}
              strokeDashoffset={donut.dashoffset}
              transform={`rotate(-90 ${donut.cx} ${donut.cy})`}
            />
            <SvgText
              x={52} y={57}
              fontSize={20} fontWeight="700" fill={colors.text} textAnchor="middle"
            >
              {`${donut.pct}%`}
            </SvgText>
          </Svg>
          <View style={styles.donutText}>
            <AppText style={styles.donutValue}>{goalDays} of {rows.length}</AppText>
            <AppText style={styles.note}>
              days met the {goal.toLocaleString()} step goal
            </AppText>
          </View>
        </View>
      </GlassCard>
    </>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: { marginBottom: spacing.md },
  title: { fontSize: 15, color: colors.text, marginBottom: spacing.xs },
  note: { fontSize: 11, color: colors.muted, marginBottom: spacing.sm },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  swatch: { width: 9, height: 9, borderRadius: 2, marginRight: 5 },
  legendText: { fontSize: 11, color: colors.muted },
  donutRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  donutText: { flex: 1, marginLeft: spacing.lg },
  donutValue: { fontSize: 20, fontFamily: fonts.display, color: colors.text, letterSpacing: -0.6, marginBottom: 2 },
});
