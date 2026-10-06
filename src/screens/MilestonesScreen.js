import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import { spacing, radius, fonts, type, TAB_BAR_CLEARANCE } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { GradientBackground, GlassCard, Entrance, LineIcon, AppText, stagger, SegmentedControl } from '../components';
import { useSteps } from '../utils/StepContext';
import useRefreshControl from '../utils/useRefreshControl';

const FILTERS = ['All', 'Earned', 'Locked'];

// Structural validation rules linked to live global step variables.
// `icon` is now a LineIcon name (was an emoji); `color` pulls from the theme.
function getDynamicMilestones(todaySteps, weeklySteps, colors) {
  const totalWeeklySteps = weeklySteps.reduce((a, b) => a + b, 0);
  const currentToday = todaySteps || 0;
  const currentWeekly = totalWeeklySteps || 0;

  const milestonesRaw = [
    { id: 1, icon: 'shoe', name: 'First Steps', desc: 'Complete your first 1,000 steps',
      calc: () => ({ progress: Math.min(Math.round((currentToday / 1000) * 100), 100), earned: currentToday >= 1000, locked: false }),
      color: colors.primary },
    { id: 4, icon: 'medal', name: '50k Week', desc: 'Walk 50,000+ steps in one week',
      calc: () => ({ progress: Math.min(Math.round((currentWeekly / 50000) * 100), 100), earned: currentWeekly >= 50000, locked: false }),
      color: colors.accent },
    { id: 7, icon: 'target', name: 'Daily Goal', desc: 'Hit 10,000 steps today',
      calc: () => ({ progress: Math.min(Math.round((currentToday / 10000) * 100), 100), earned: currentToday >= 10000, locked: false }),
      color: colors.goal },
    { id: 8, icon: 'trophy', name: 'Half Marathon Day', desc: 'Walk 20,000 steps in a single day',
      calc: () => ({ progress: Math.min(Math.round((currentToday / 20000) * 100), 100), earned: currentToday >= 20000, locked: false }),
      color: colors.primary },
    { id: 10, icon: 'globe', name: 'Globe Trotter', desc: "Walk the equivalent of Earth's circumference",
      calc: () => ({ progress: 0, earned: false, locked: true }), color: colors.mutedDark },
    { id: 11, icon: 'mountain', name: 'Mountain Climber', desc: 'Maintain a 30-day streak',
      calc: () => ({ progress: 0, earned: false, locked: true }), color: colors.mutedDark },
    { id: 12, icon: 'diamond', name: 'Diamond Walker', desc: '10,000 total step days overall',
      calc: () => ({ progress: 0, earned: false, locked: true }), color: colors.mutedDark },
  ];

  return milestonesRaw.map(({ calc, ...rest }) => ({ ...rest, ...calc() }));
}

export default function MilestonesScreen() {
  const [filter, setFilter] = useState('All');
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { refreshControl } = useRefreshControl();
  const { todaySteps, weeklySteps } = useSteps();

  const milestonesList = getDynamicMilestones(todaySteps, weeklySteps, colors);

  const filtered = milestonesList.filter(m => {
    if (filter === 'Earned') return m.earned;
    if (filter === 'Locked') return m.locked || (!m.earned && !m.locked);
    return true;
  });

  const earnedCount = milestonesList.filter(m => m.earned).length;
  const progressPercentage = milestonesList.length > 0
    ? Math.round((earnedCount / milestonesList.length) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <GradientBackground>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>

          <Entrance preset="up" delay={30}>
            <GlassCard style={styles.progressCard}>
              <View style={styles.progressRow}>
                <View>
                  <AppText weight="displayExtra" style={styles.progressCount}>{earnedCount} / {milestonesList.length}</AppText>
                  <AppText style={styles.progressLabel}>milestones earned</AppText>
                </View>
                <View style={styles.progressRing}>
                  <AppText weight="semibold" style={styles.progressPct}>{progressPercentage}%</AppText>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
              </View>
            </GlassCard>
          </Entrance>

          <Entrance preset="up" delay={70}>
            {/* SegmentedControl is index-based; `filter` stays a label string so
                the filtering logic below is untouched. */}
            <SegmentedControl
              options={FILTERS}
              value={FILTERS.indexOf(filter)}
              onChange={(i) => setFilter(FILTERS[i])}
              style={styles.filters}
            />
          </Entrance>

          {filtered.map((m, i) => (
            <Entrance key={m.id} preset="up" delay={110 + stagger(i)}>
              <GlassCard padding={spacing.md} style={[styles.milestoneCard, m.locked && styles.milestoneCardLocked]}>
                <View style={styles.milestoneInner}>
                  <View style={[styles.iconWrap, { borderColor: m.earned ? m.color : m.locked ? colors.border : colors.borderLight }]}>
                    <LineIcon name={m.icon} size={26} color={m.earned ? m.color : m.locked ? colors.mutedDark : colors.muted} />
                  </View>
                  <View style={styles.milestoneBody}>
                    <View style={styles.milestoneTop}>
                      <AppText weight="medium" style={[styles.milestoneName, m.locked && styles.textLocked]}>{m.name}</AppText>
                      {m.earned && (
                        <View style={styles.earnedBadge}>
                          <AppText weight="medium" style={styles.earnedText}>✓ Unlocked</AppText>
                        </View>
                      )}
                      {m.locked && <AppText style={styles.lockedIcon}>🔒</AppText>}
                    </View>
                    <AppText style={styles.milestoneDesc}>{m.desc}</AppText>
                    {!m.earned && !m.locked && (
                      <View style={styles.progressBarSmall}>
                        <View style={[styles.progressFillSmall, { width: `${m.progress}%`, backgroundColor: m.color }]} />
                      </View>
                    )}
                    {!m.earned && !m.locked && (
                      <AppText weight="medium" style={[styles.progressPctSmall, { color: m.color }]}>{m.progress}%</AppText>
                    )}
                  </View>
                </View>
              </GlassCard>
            </Entrance>
          ))}

        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE },
  progressCard: { marginBottom: spacing.lg },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  progressCount: { fontSize: 32, color: colors.text, letterSpacing: -1 },
  progressLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  progressRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  progressPct: { fontSize: 14, color: colors.primary },
  progressBar: { height: 6, backgroundColor: colors.surface2, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  filters: { marginBottom: spacing.md },
  milestoneCard: { marginBottom: spacing.sm },
  milestoneCardLocked: { opacity: 0.5 },
  milestoneInner: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  iconWrap: { width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  milestoneBody: { flex: 1 },
  milestoneTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  milestoneName: { flex: 1, fontSize: 14, color: colors.text },
  textLocked: { color: colors.mutedDark },
  earnedBadge: { backgroundColor: colors.successBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  earnedText: { fontSize: 10, color: colors.success },
  lockedIcon: { fontSize: 12 },
  milestoneDesc: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  progressBarSmall: { height: 4, backgroundColor: colors.surface2, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFillSmall: { height: '100%', borderRadius: 2 },
  progressPctSmall: { fontSize: 11 },
});
