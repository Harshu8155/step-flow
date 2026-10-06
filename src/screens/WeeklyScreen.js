import React, { useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import { spacing, radius, fonts, type, TAB_BAR_CLEARANCE } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import {
  WeeklyBarChart, MilestoneBadge, SectionHeader,
  GradientBackground, GlassCard, Entrance, AppText, stagger,
} from '../components';
import { useSteps } from '../utils/StepContext';
import useRefreshControl from '../utils/useRefreshControl';

const DAILY_GOAL = 10000;
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_OF_WEEK_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getTodayWeekIndex() {
  return (new Date().getDay() + 6) % 7; // 0 = Monday ... 6 = Sunday
}

export default function WeeklyScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { refreshControl } = useRefreshControl();
  const { todaySteps, weeklySteps } = useSteps();
  const todayIndex = getTodayWeekIndex();

  const weeklyData = weeklySteps.map((value, i) => ({ day: DAYS_OF_WEEK_SHORT[i], value }));

  const total = weeklySteps.reduce((a, b) => a + b, 0);
  const activeDays = weeklySteps.filter(v => v > 0).length || 1;
  const avg = Math.round(total / activeDays); // avg over active days — matches Stats
  const best = Math.max(...weeklySteps);
  const goalDays = weeklySteps.filter(s => s >= DAILY_GOAL).length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <GradientBackground>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>

          <Entrance preset="up" delay={30}>
            <GlassCard padding={spacing.xl} style={styles.totalCard}>
              <AppText weight="displayExtra" style={styles.totalSteps}>{total.toLocaleString()}</AppText>
              <AppText style={styles.totalLabel}>total steps this week</AppText>
            </GlassCard>
          </Entrance>

          <Entrance preset="up" delay={70}>
            <View style={styles.statsRow}>
              <GlassCard radius={radius.md} padding={spacing.md} style={styles.miniCard}>
                <AppText weight="semibold" style={styles.miniVal}>{avg.toLocaleString()}</AppText>
                <AppText style={styles.miniLbl}>daily avg</AppText>
              </GlassCard>
              <GlassCard radius={radius.md} padding={spacing.md} style={styles.miniCard}>
                <AppText weight="semibold" style={styles.miniVal}>{best.toLocaleString()}</AppText>
                <AppText style={styles.miniLbl}>best day</AppText>
              </GlassCard>
              <GlassCard radius={radius.md} padding={spacing.md} style={styles.miniCard}>
                <AppText weight="semibold" style={[styles.miniVal, { color: colors.accent }]}>{goalDays}/7</AppText>
                <AppText style={styles.miniLbl}>goal days</AppText>
              </GlassCard>
            </View>
          </Entrance>

          <Entrance preset="up" delay={110}>
            <GlassCard style={styles.card}>
              <SectionHeader title="Day by day" />
              <WeeklyBarChart data={weeklyData} activeIndex={todayIndex} height={110} />
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <AppText style={styles.legendText}>Steps</AppText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.surface2 }]} />
                  <AppText style={styles.legendText}>Below goal</AppText>
                </View>
              </View>
            </GlassCard>
          </Entrance>

          <Entrance preset="up" delay={150}>
            <GlassCard style={styles.card}>
              <SectionHeader title="Day breakdown" />
              {weeklySteps.map((value, i) => {
                const pct = value / DAILY_GOAL;
                return (
                  <Entrance key={i} preset="left" delay={190 + stagger(i)}>
                    <View style={styles.dayRow}>
                      <AppText style={styles.dayName}>{DAYS_OF_WEEK[i]}</AppText>
                      <View style={styles.dayBar}>
                        <View style={[styles.dayFill, { width: `${Math.min(pct * 100, 100)}%` }, pct >= 1 ? styles.dayFillGoal : styles.dayFillDefault]} />
                      </View>
                      <AppText style={styles.dayVal}>{value.toLocaleString()}</AppText>
                    </View>
                  </Entrance>
                );
              })}
            </GlassCard>
          </Entrance>

          <Entrance preset="up" delay={190}>
            <GlassCard style={styles.card}>
              <SectionHeader title="This week's milestones" />
              <MilestoneBadge icon="medal" name="50k Steps Club" desc="Weekly total reached" completed={total >= 50000} />
              <MilestoneBadge icon="flame" name="5-Day Streak" desc="Hit goal 5 days in a row" completed={goalDays >= 5} />
              <MilestoneBadge icon="target" name="Daily Goal" desc="Hit 10,000 steps today" completed={todaySteps >= DAILY_GOAL} />
            </GlassCard>
          </Entrance>

        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE },

  totalCard: { alignItems: 'center', marginBottom: spacing.md },
  totalSteps: { fontSize: 48, color: colors.text, letterSpacing: -2 },
  totalLabel: { fontSize: 13, color: colors.muted, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  miniCard: { flex: 1, alignItems: 'center' },
  miniVal: { fontSize: 16, color: colors.text },
  miniLbl: { fontSize: 10, color: colors.muted, marginTop: 2 },

  card: { marginBottom: spacing.md },

  chartLegend: { flexDirection: 'row', gap: 16, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.muted },

  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dayName: { width: 70, fontSize: 12, color: colors.muted },
  dayBar: { flex: 1, height: 6, backgroundColor: colors.surface2, borderRadius: 3, overflow: 'hidden' },
  dayFill: { height: '100%', borderRadius: 3 },
  dayFillGoal: { backgroundColor: colors.accent },
  dayFillDefault: { backgroundColor: colors.primary },
  dayVal: { width: 50, fontSize: 11, color: colors.textSecondary, textAlign: 'right' },
});
