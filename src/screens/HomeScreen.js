import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, StyleSheet, ScrollView,
  SafeAreaView, StatusBar,
} from 'react-native';
import { Pedometer } from 'expo-sensors';
import { spacing, radius, fonts, type, TAB_BAR_CLEARANCE } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import {
  RingProgress, StatCard, SectionHeader, WeeklyBarChart, MilestoneBadge,
  GradientBackground, GlassCard, Entrance, AppText, PressableScale, Skeleton,
  QuickActions, LineIcon,
} from '../components';
import { useSteps } from '../utils/StepContext';
import { useAuth } from '../utils/AuthContext';
import useRefreshControl from '../utils/useRefreshControl';
import { notifySuccess } from '../utils/haptics';

const DAILY_GOAL = 10000;

function buildWeeklyData(pastSteps) {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return pastSteps.map((value, i) => ({ day: labels[i], value }));
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning!';
  if (h < 17) return 'Good afternoon!';
  return 'Good evening!';
}

function getTodayWeekIndex() {
  // 0 = Monday ... 6 = Sunday, matching StepContext's Mon–Sun weeklySteps ordering
  return (new Date().getDay() + 6) % 7;
}

export default function HomeScreen({ navigation }) {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { todaySteps, setTodaySteps, weeklySteps, unit, loaded, refresh } = useSteps();
  const { user } = useAuth();
  const { refreshControl } = useRefreshControl();

  // The Sync quick action runs the same reconcile as pull-to-refresh.
  const onSyncPress = () => { refresh?.(); };

  // Fall back to a neutral label rather than a fake name if the profile has no name.
  const displayName = user?.name?.trim() || 'There';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const progress = Math.min(todaySteps / DAILY_GOAL, 1);
  const isImperial = unit === 'Imperial';
  const distanceMultiplier = isImperial ? 0.0004736 : 0.000762;
  const distanceLabel = isImperial ? 'mi' : 'km';
  const stepsToDistance = (steps) => (steps * distanceMultiplier).toFixed(1);
  const stepsToCalories = (steps) => Math.round(steps * 0.04);

  const distance = stepsToDistance(todaySteps);
  const calories = stepsToCalories(todaySteps);

  useEffect(() => {
    let cancelled = false;
    const checkAvailability = async () => {
      try {
        const { status: existingStatus } = await Pedometer.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Pedometer.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          if (!cancelled) setIsPedometerAvailable('no');
          return;
        }
      } catch (e) {
        if (!cancelled) setIsPedometerAvailable('no');
        return;
      }
      const available = await Pedometer.isAvailableAsync();
      if (!cancelled) setIsPedometerAvailable(available ? 'yes' : 'no');
    };
    checkAvailability();
    return () => { cancelled = true; };
  }, []);

  // Celebrate the moment the goal is crossed — but only on a real crossing.
  // Seeding from `null` means the first render after hydration (which jumps
  // 0 -> today's stored total) doesn't fire it for an already-met goal.
  const prevSteps = useRef(null);
  useEffect(() => {
    if (!loaded) return;
    const prev = prevSteps.current;
    prevSteps.current = todaySteps;
    if (prev !== null && prev < DAILY_GOAL && todaySteps >= DAILY_GOAL) notifySuccess();
  }, [todaySteps, loaded]);

  const weeklyData = buildWeeklyData(weeklySteps);
  const todayIndex = getTodayWeekIndex();
  const addTestSteps = () => setTodaySteps(prev => prev + 500);

  // The hero line reacts to progress instead of being static decoration — it's
  // the largest text on screen, so it may as well carry information.
  const heroLine =
    progress >= 1 ? 'Goal smashed!'
    : progress >= 0.5 ? 'Keep it going!'
    : "Let's start\nstrong!";

  const quickActions = [
    { key: 'heart', icon: 'heart', label: 'Heart rate', onPress: () => navigation.navigate('HeartRate') },
    { key: 'badges', icon: 'trophy', label: 'Badges', onPress: () => navigation.navigate('Milestones', { todaySteps, weeklySteps }) },
    { key: 'week', icon: 'calendar', label: 'Weekly', onPress: () => navigation.navigate('Weekly', { todaySteps, weeklySteps }) },
    { key: 'sync', icon: 'sync', label: 'Sync', onPress: onSyncPress },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <GradientBackground>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >

          <Entrance preset="up" delay={30}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <AppText style={styles.greeting}>{getGreeting()}</AppText>
                <AppText style={styles.hero}>{heroLine}</AppText>
              </View>
              <PressableScale style={styles.avatar} scale={0.92} onPress={() => navigation.navigate('Profile')}>
                <AppText weight="semibold" style={styles.avatarText}>{avatarInitial}</AppText>
              </PressableScale>
            </View>
          </Entrance>

          {isPedometerAvailable === 'no' && (
            <View style={styles.warningBanner}>
              <AppText style={styles.warningText}>Step counter not available or permission denied</AppText>
            </View>
          )}

          {/* Goal card: the progress line plus the one orange action on screen. */}
          <Entrance preset="up" delay={60}>
            <GlassCard radius={radius.xl} padding={spacing.xl} style={styles.goalCard}>
              <View style={styles.goalTop}>
                <AppText weight="semibold" style={styles.goalHeadline}>
                  You&apos;re {Math.round(progress * 100)}% to your{'\n'}daily goal
                </AppText>
                <PressableScale
                  style={styles.goalFab}
                  scale={0.9}
                  haptic="light"
                  onPress={() => navigation.navigate('Stats')}
                >
                  <LineIcon name="bolt" size={20} color={colors.onAccent} strokeWidth={1.9} />
                </PressableScale>
              </View>
              <View style={styles.goalBar}>
                <View style={[styles.goalFill, { width: `${Math.max(Math.min(progress * 100, 100), 3)}%` }]} />
              </View>
              <AppText style={styles.goalMetaText}>
                <AppText weight="semibold" style={{ color: colors.text }}>{todaySteps.toLocaleString()}</AppText>
                /{DAILY_GOAL.toLocaleString()}
              </AppText>
            </GlassCard>
          </Entrance>

          <Entrance preset="up" delay={80}>
            <QuickActions actions={quickActions} />
          </Entrance>

          {/* Until AsyncStorage has hydrated, `todaySteps` is 0 — showing that
              confidently and then snapping to the real total reads as a bug, so
              hold a skeleton over the ring and the tiles instead. */}
          <AppText style={styles.sectionTitle}>Daily Summary</AppText>

          {!loaded ? (
            <View style={styles.summaryRow}>
              {[0, 1].map(i => (
                <View key={i} style={styles.summarySkeleton}>
                  <Skeleton height={96} radius={radius.md} />
                </View>
              ))}
            </View>
          ) : (
            <Entrance preset="up" delay={110}>
              <View style={styles.summaryRow}>
                {/* Steps gets the ring inline rather than a hero ring above the
                    fold — the goal card already carries the headline progress,
                    and two large progress indicators competed. */}
                <GlassCard radius={radius.md} padding={spacing.lg} style={styles.summaryCard}>
                  <View style={styles.summaryInner}>
                    <View style={styles.summaryText}>
                      <AppText style={styles.summaryLabel}>Steps</AppText>
                      <AppText style={styles.summaryValue}>{todaySteps.toLocaleString()}</AppText>
                    </View>
                    <RingProgress
                      size={46} strokeWidth={5} progress={progress}
                      value="" label=""
                    />
                  </View>
                </GlassCard>

                <GlassCard radius={radius.md} padding={spacing.lg} style={styles.summaryCard}>
                  <View style={styles.summaryText}>
                    <AppText style={styles.summaryLabel}>Calories Burned</AppText>
                    <AppText style={styles.summaryValue}>{calories} <AppText style={styles.summaryUnit}>kcal</AppText></AppText>
                  </View>
                </GlassCard>
              </View>

              <View style={styles.statsRow}>
                <StatCard label="Distance" value={distance} unit={distanceLabel} />
                <StatCard label="Remaining" value={Math.max(DAILY_GOAL - todaySteps, 0).toLocaleString()} />
              </View>
            </Entrance>
          )}

          <Entrance preset="up" delay={170}>
            <GlassCard style={styles.card}>
              <SectionHeader
                title="This week"
                action="See all"
                onAction={() => navigation.navigate('Weekly', { todaySteps, weeklySteps })}
              />
              <WeeklyBarChart data={weeklyData} activeIndex={todayIndex} height={90} />
            </GlassCard>
          </Entrance>

          <Entrance preset="up" delay={210}>
            <GlassCard style={styles.card}>
              <SectionHeader
                title="Milestones"
                action="View all"
                onAction={() => navigation.navigate('Milestones', { todaySteps, weeklySteps })}
              />
              <MilestoneBadge icon="medal" name="50k Steps Club" desc="Reached this week" completed={weeklySteps.reduce((a, b) => a + b, 0) >= 50000} />
              <MilestoneBadge icon="target" name="Daily Goal" desc="Hit 10,000 steps today" completed={todaySteps >= DAILY_GOAL} />
              <MilestoneBadge icon="bolt" name="First 1,000" desc="Walk 1,000 steps" completed={todaySteps >= 1000} />
            </GlassCard>
          </Entrance>

          {__DEV__ && (
            <PressableScale style={styles.testBtn} haptic="light" onPress={addTestSteps}>
              <AppText weight="medium" style={styles.testBtnText}>+ 500 Steps (Test)</AppText>
            </PressableScale>
          )}

        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl },
  // The hero wraps to two lines, so the avatar must not be squeezed by it.
  headerText: { flex: 1, paddingRight: spacing.md },
  greeting: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  hero: { ...type.hero, color: colors.text },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  avatarText: { fontSize: 16, color: colors.onAccent },
  warningBanner: { backgroundColor: colors.warnBg, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.danger },
  warningText: { fontSize: 13, color: colors.danger, textAlign: 'center' },

  // Goal card
  goalCard: { marginBottom: spacing.xl },
  goalTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg },
  goalHeadline: { fontSize: 15, lineHeight: 21, color: colors.text, flex: 1, paddingRight: spacing.md, letterSpacing: -0.2 },
  goalFab: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  goalBar: { height: 12, backgroundColor: colors.glassIn, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.sm },
  goalFill: { height: '100%', backgroundColor: colors.accent, borderRadius: radius.full },
  goalMetaText: { fontSize: 12, color: colors.muted, textAlign: 'right' },

  sectionTitle: { ...type.section, color: colors.text, marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', marginBottom: spacing.sm },
  summaryCard: { flex: 1, marginHorizontal: 4 },
  summaryInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryText: { flex: 1 },
  summaryLabel: { fontSize: 11, fontFamily: fonts.medium, color: colors.muted, marginBottom: 6 },
  summaryValue: { ...type.stat, color: colors.text },
  summaryUnit: { fontSize: 12, fontFamily: fonts.medium, color: colors.muted, letterSpacing: 0 },
  summarySkeleton: { flex: 1, marginHorizontal: 4 },

  statsRow: { flexDirection: 'row', marginBottom: spacing.xl },
  card: { marginBottom: spacing.md },
  testBtn: { backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.success, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md, borderStyle: 'dashed' },
  testBtnText: { color: colors.success, fontSize: 13 },
});
