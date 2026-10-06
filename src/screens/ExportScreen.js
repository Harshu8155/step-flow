// Export viewer: previews exactly what will be exported, then writes it to a PDF.
//
// The preview and the PDF are built from the same `rows`/`summary` values, so what
// the user sees on screen is what lands in the file.
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, SafeAreaView, StatusBar, Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useSteps } from '../utils/StepContext';
import { useAuth } from '../utils/AuthContext';
import { buildSeries, chartsToSvg } from '../utils/exportCharts';
import {
  GradientBackground, GlassCard, Entrance, LineIcon, AppText,
  PressableScale, SegmentedControl, Button, ExportCharts,
} from '../components';

const RANGES = [
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 30 },
  { key: 'all', label: 'All time', days: null },
];

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function prettyDate(key) {
  // key is "yyyy-MM-dd"; the T00:00:00 suffix keeps it in local time.
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Escape anything user-controlled before it goes into the PDF's HTML. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function ExportScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { dailySteps, dailyGoal, unit } = useSteps();
  const { user } = useAuth();

  const [range, setRange] = useState('week');
  const [busy, setBusy] = useState(false);

  const isImperial = unit === 'Imperial';
  const distanceUnit = isImperial ? 'mi' : 'km';
  const distanceFactor = isImperial ? 0.0004736 : 0.000762;

  // Days in range, newest first, only those we actually have data for.
  const rows = useMemo(() => {
    const selected = RANGES.find(r => r.key === range);
    let keys = Object.keys(dailySteps).sort().reverse();

    if (selected?.days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (selected.days - 1));
      cutoff.setHours(0, 0, 0, 0);
      const cutoffKey = dateKey(cutoff);
      keys = keys.filter(k => k >= cutoffKey);
    }

    return keys.map(key => {
      const steps = dailySteps[key] || 0;
      return {
        key,
        steps,
        distance: (steps * distanceFactor).toFixed(2),
        calories: Math.round(steps * 0.04),
        metGoal: steps >= dailyGoal,
      };
    });
  }, [dailySteps, range, dailyGoal, distanceFactor]);

  const summary = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + r.steps, 0);
    const active = rows.filter(r => r.steps > 0).length;
    const goalDays = rows.filter(r => r.metGoal).length;
    const best = rows.reduce((max, r) => Math.max(max, r.steps), 0);
    return {
      total,
      active,
      goalDays,
      best,
      // Average over days with data — averaging in untracked days understates it.
      avg: active ? Math.round(total / active) : 0,
      distance: (total * distanceFactor).toFixed(1),
      calories: Math.round(total * 0.04),
    };
  }, [rows, distanceFactor]);

  const rangeLabel = RANGES.find(r => r.key === range)?.label ?? '';

  const buildHtml = useCallback(() => {
    const name = escapeHtml(user?.name || 'StepFlow User');
    const email = escapeHtml(user?.email || '');
    const generated = new Date().toLocaleString();

    // Same geometry module the on-screen preview uses, so the PDF's graphs are
    // the ones the user just looked at. Skipped entirely for an empty range.
    const { points, bucketDays } = buildSeries(rows);
    const chartMarkup = points.length === 0 ? '' : chartsToSvg({
      points,
      goal: dailyGoal,
      goalDays: summary.goalDays,
      totalDays: rows.length,
      bucketDays,
      // Fixed hex rather than theme colours: the PDF is a document, and it
      // shouldn't come out dark because the app happened to be in dark mode.
      palette: {
        accent: '#E8552B',
        bar: '#17171A',
        grid: '#E4E2DF',
        muted: '#8A8A90',
        text: '#17171A',
      },
    });

    const tableRows = rows.map(r => `
      <tr>
        <td>${escapeHtml(prettyDate(r.key))}</td>
        <td class="num">${r.steps.toLocaleString()}</td>
        <td class="num">${r.distance} ${escapeHtml(distanceUnit)}</td>
        <td class="num">${r.calories.toLocaleString()}</td>
        <td class="num">${r.metGoal ? 'Yes' : '—'}</td>
      </tr>`).join('');

    // Inline styles only: the PDF renderer has no access to external assets.
    return `
<html>
  <head><meta charset="utf-8" /></head>
  <body style="font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #17171A; padding: 32px;">
    <style>
      h1 { font-size: 24px; margin: 0 0 4px; color: #E8552B; }
      .sub { color: #8A8A90; font-size: 12px; margin: 0 0 24px; }
      .cards { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 28px; }
      .card { border: 1px solid #E4E2DF; border-radius: 12px; padding: 12px 16px; min-width: 120px; }
      .card .v { font-size: 20px; font-weight: 700; }
      .card .l { font-size: 11px; color: #8A8A90; text-transform: uppercase; letter-spacing: .5px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { text-align: left; background: #FCEAE3; padding: 8px; border-bottom: 2px solid #E4E2DF; }
      td { padding: 7px 8px; border-bottom: 1px solid #EDEBE8; }
      td.num, th.num { text-align: right; }
      .foot { margin-top: 24px; font-size: 10px; color: #B4B4B9; }
      .charts { display: flex; gap: 24px; align-items: flex-start; margin-bottom: 28px; }
      .charts > .chart:first-child { flex: 1; }
      .chart-title { font-size: 12px; font-weight: 700; margin-bottom: 8px; }
      .chart-note { font-size: 10px; color: #8A8A90; margin-top: 6px; max-width: 160px; }
      /* Keep the table from being split away from its header on page 2. */
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    </style>

    <h1>StepFlow export</h1>
    <p class="sub">
      ${name}${email ? ` &middot; ${email}` : ''}<br />
      ${escapeHtml(rangeLabel)} &middot; ${rows.length} day${rows.length === 1 ? '' : 's'}
      &middot; generated ${escapeHtml(generated)}
    </p>

    <div class="cards">
      <div class="card"><div class="v">${summary.total.toLocaleString()}</div><div class="l">Total steps</div></div>
      <div class="card"><div class="v">${summary.avg.toLocaleString()}</div><div class="l">Daily average</div></div>
      <div class="card"><div class="v">${summary.best.toLocaleString()}</div><div class="l">Best day</div></div>
      <div class="card"><div class="v">${summary.distance} ${escapeHtml(distanceUnit)}</div><div class="l">Distance</div></div>
      <div class="card"><div class="v">${summary.calories.toLocaleString()}</div><div class="l">Calories</div></div>
      <div class="card"><div class="v">${summary.goalDays}/${rows.length}</div><div class="l">Goal days</div></div>
    </div>

    <div class="charts">${chartMarkup}</div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th class="num">Steps</th>
          <th class="num">Distance</th>
          <th class="num">Calories</th>
          <th class="num">Goal met</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>

    <p class="foot">Daily goal: ${dailyGoal.toLocaleString()} steps &middot; Exported from StepFlow</p>
  </body>
</html>`;
  }, [rows, summary, user, rangeLabel, distanceUnit, dailyGoal]);

  const onDownload = useCallback(async () => {
    if (rows.length === 0) {
      Alert.alert('Nothing to export', 'There is no step data in this range yet.');
      return;
    }

    setBusy(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml() });

      // Sharing is how a sandboxed app hands a file to the user: the share sheet
      // includes "Save to Files"/"Download", so it covers saving as well as sending.
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save your StepFlow export',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF created', `Saved to:\n${uri}`);
      }
    } catch (err) {
      Alert.alert('Export failed', err?.message || 'Could not generate the PDF.');
    } finally {
      setBusy(false);
    }
  }, [rows, buildHtml]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <GradientBackground>

        <View style={styles.header}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LineIcon name="chevron-left" size={22} color={colors.text} />
          </PressableScale>
          <AppText weight="display" style={styles.headerTitle}>Export data</AppText>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Entrance preset="up" delay={30}>
            {/* `range` stays the RANGES key so the export logic is untouched;
                only the index is mapped in and out for the control. */}
            <SegmentedControl
              options={RANGES.map(r => r.label)}
              value={RANGES.findIndex(r => r.key === range)}
              onChange={(i) => setRange(RANGES[i].key)}
              style={styles.rangeRow}
            />
          </Entrance>

          <Entrance preset="up" delay={70}>
            <GlassCard style={styles.card}>
              <AppText weight="medium" style={styles.cardTitle}>Summary</AppText>
              <View style={styles.grid}>
                {[
                  { label: 'Total steps', value: summary.total.toLocaleString() },
                  { label: 'Daily average', value: summary.avg.toLocaleString() },
                  { label: 'Best day', value: summary.best.toLocaleString() },
                  { label: 'Distance', value: `${summary.distance} ${distanceUnit}` },
                  { label: 'Calories', value: summary.calories.toLocaleString() },
                  { label: 'Goal days', value: `${summary.goalDays}/${rows.length}` },
                ].map((s, i) => (
                  <View key={i} style={styles.gridItem}>
                    <AppText weight="semibold" style={styles.gridValue}>{s.value}</AppText>
                    <AppText style={styles.gridLabel}>{s.label}</AppText>
                  </View>
                ))}
              </View>
            </GlassCard>
          </Entrance>

          {/* Charts sit between the summary and the table: the numbers say what
              happened, the graphs show the shape of it, then the table has the
              detail. All three come from the same `rows`. */}
          {rows.length > 0 && (
            <Entrance preset="up" delay={110}>
              <ExportCharts rows={rows} goal={dailyGoal} goalDays={summary.goalDays} />
            </Entrance>
          )}

          <Entrance preset="up" delay={150}>
            <GlassCard style={styles.card}>
              <AppText weight="medium" style={styles.cardTitle}>
                Daily breakdown ({rows.length})
              </AppText>

              {rows.length === 0 ? (
                <AppText style={styles.empty}>No step data in this range yet.</AppText>
              ) : (
                rows.map((r, i) => (
                  <View
                    key={r.key}
                    style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
                  >
                    <View style={styles.rowLeft}>
                      <AppText style={styles.rowDate}>{prettyDate(r.key)}</AppText>
                      <AppText style={styles.rowMeta}>
                        {r.distance} {distanceUnit} &middot; {r.calories} cal
                      </AppText>
                    </View>
                    <View style={styles.rowRight}>
                      <AppText weight="semibold" style={styles.rowSteps}>
                        {r.steps.toLocaleString()}
                      </AppText>
                      {r.metGoal && (
                        <LineIcon name="check" size={14} color={colors.success} />
                      )}
                    </View>
                  </View>
                ))
              )}
            </GlassCard>
          </Entrance>

          <View style={styles.bottomSpace} />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Download PDF"
            icon="download"
            onPress={onDownload}
            loading={busy}
            disabled={rows.length === 0}
            size="lg"
            full
          />
        </View>

      </GradientBackground>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  container: { padding: spacing.lg, paddingTop: spacing.sm },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, color: colors.text },

  rangeRow: { marginBottom: spacing.lg },

  card: { marginBottom: spacing.lg },
  cardTitle: { fontSize: 15, color: colors.text, marginBottom: spacing.md },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '33.33%', marginBottom: spacing.md },
  gridValue: { fontSize: 17, color: colors.text },
  gridLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLeft: { flex: 1 },
  rowDate: { fontSize: 14, color: colors.text },
  rowMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowSteps: { fontSize: 15, color: colors.text },

  empty: { fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },

  bottomSpace: { height: 90 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: spacing.lg, paddingBottom: spacing.xl,
    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border,
  },
});
