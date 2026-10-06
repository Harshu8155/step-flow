// utils/StepContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collectBackgroundSteps, startStepService, isServiceSupported,
  isHealthConnectAvailable, requestHealthConnectPermission,
  setServiceUnit, setServiceGoal,
} from './backgroundSteps';

const STORAGE_KEY = 'daily_steps_v1';
const DEFAULT_DAILY_GOAL = 10000;
const DEFAULT_UNIT = 'Metric';

const StepContext = createContext(null);

// ── date helpers (all local-time, never UTC, to avoid midnight-boundary bugs) ──

function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d = new Date()) {
  // Monday as the first day of the week
  const date = new Date(d);
  const dow = (date.getDay() + 6) % 7; // 0 = Monday ... 6 = Sunday
  date.setDate(date.getDate() - dow);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d, n) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── persistence ──

async function loadAllSteps() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('Failed to load step history from storage:', err);
    return {};
  }
}

async function persistAllSteps(data) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to persist step history:', err);
  }
}

export function StepProvider({ children }) {
  // dailySteps: { "2026-06-21": 8423, ... } — single source of truth, persisted
  const [dailySteps, setDailySteps] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [dailyGoal, setDailyGoalState] = useState(DEFAULT_DAILY_GOAL);
  const [unit, setUnitState] = useState(DEFAULT_UNIT);
  const writeTimer = useRef(null);

  const todayKey = dateKey();
  const todaySteps = dailySteps[todayKey] || 0;

  // Debounced persistence — avoid hammering AsyncStorage on every pedometer tick
  const scheduleSave = useCallback((data) => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      persistAllSteps(data);
    }, 1000);
  }, []);

  const setTodaySteps = useCallback((value) => {
    setDailySteps(prev => {
      const resolved = typeof value === 'function' ? value(prev[todayKey] || 0) : value;
      const next = { ...prev, [todayKey]: resolved };
      scheduleSave(next);
      return next;
    });
  }, [todayKey, scheduleSave]);

  // Merge in a batch of historical day readings without clobbering other days
  const mergeDays = useCallback((entries) => {
    setDailySteps(prev => {
      const next = { ...prev, ...entries };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // 1. Load persisted history on mount (or seed with mock data on first launch)
  useEffect(() => {
    (async () => {
      let stored = await loadAllSteps();
      const hasInitialized = await AsyncStorage.getItem('has_initialized_v1');

      // Load goal and unit
      const storedGoal = await AsyncStorage.getItem('daily_goal_v1');
      const storedUnit = await AsyncStorage.getItem('unit_v1');
      if (storedGoal) {
        const parsedGoal = parseInt(storedGoal, 10);
        setDailyGoalState(parsedGoal);
        // The notification ring fills against this, so it has to survive a
        // restart where only the service comes back.
        setServiceGoal(parsedGoal);
      }
      if (storedUnit) {
        setUnitState(storedUnit);
        // Keep the notification's distance in the unit the user last chose,
        // even across a restart where only the service comes back.
        setServiceUnit(storedUnit);
      }

      if (!hasInitialized && (!stored || Object.keys(stored).length === 0)) {
        // Seed with beautiful mock data for the last 30 days
        const seeded = {};
        const mockValues = [
          5400, 6200, 7100, 8000, 9500, 11000, 8800, 7200, 6800, 8900,
          10200, 11500, 9300, 7400, 8100, 9600, 10800, 12200, 8700, 7900,
          6500, 8400, 9100, 7500, 11200, 9500, 8200, 9000, 10500, 0
        ];
        for (let i = 29; i >= 0; i--) {
          const day = addDays(new Date(), -i);
          const key = dateKey(day);
          seeded[key] = mockValues[29 - i];
        }
        stored = seeded;
        await persistAllSteps(stored);
        await AsyncStorage.setItem('has_initialized_v1', 'true');
      }
      setDailySteps(stored);
      setLoaded(true);
    })();
  }, []);

  const setDailyGoal = useCallback(async (val) => {
    try {
      setDailyGoalState(val);
      await AsyncStorage.setItem('daily_goal_v1', String(val));
      // Refill the notification ring against the new target straight away.
      setServiceGoal(val);
    } catch (err) {
      console.warn('Failed to persist daily goal:', err);
    }
  }, []);

  const setUnit = useCallback(async (val) => {
    try {
      setUnitState(val);
      await AsyncStorage.setItem('unit_v1', val);
      // The foreground service notification shows distance too, so it needs the
      // new unit immediately rather than at next launch.
      setServiceUnit(val);
    } catch (err) {
      console.warn('Failed to persist unit:', err);
    }
  }, []);

  const resetSteps = useCallback(async () => {
    try {
      const cleared = {};
      cleared[todayKey] = 0;
      setDailySteps(cleared);
      await persistAllSteps(cleared);
      await AsyncStorage.setItem('has_initialized_v1', 'true');
    } catch (err) {
      console.warn('Failed to reset step history:', err);
    }
  }, [todayKey]);

  // Whether Health Connect is installed AND has granted us read access. Lives in
  // a ref rather than the effect's closure so `refresh` (below) can read it too.
  const healthConnectReadyRef = useRef(false);

  // Manual re-sync, wired to pull-to-refresh on the step screens. Runs the same
  // two reconciles the foreground-resume listener does, so a pull does real work
  // instead of just spinning.
  const refresh = useCallback(async () => {
    try {
      const entries = await collectBackgroundSteps({
        useHealthConnect: healthConnectReadyRef.current,
      });
      if (Object.keys(entries).length > 0) mergeDays(entries);
    } catch (err) {
      console.warn('Manual step refresh failed:', err);
    }
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const r = await Pedometer.getStepCountAsync(start, new Date());
      setTodaySteps(r.steps || 0);
    } catch (err) {
      // Android throws (unsupported) — the live watcher is the source of truth there.
    }
  }, [mergeDays, setTodaySteps]);

  // 2. Once loaded, keep today's count live and reconcile when the app returns
  //    to the foreground.
  //
  //    iOS: CoreMotion keeps authoritative history — including steps taken while the
  //    app was backgrounded or killed — so we backfill recent days and re-query
  //    getStepCountAsync on mount and on every foreground resume.
  //
  //    Android: getStepCountAsync is unsupported (the native module throws), so we
  //    can't query history. Instead we keep a single long-lived watchStepCount
  //    subscription and add its running delta on top of today's stored total. The
  //    hardware TYPE_STEP_COUNTER keeps counting while we're backgrounded, so that
  //    delta jumps to include background steps on the next event after resume — as
  //    long as we never tear the subscription down. (Steps taken while the app is
  //    fully killed can't be recovered without a foreground service or Health Connect.)
  useEffect(() => {
    if (!loaded) return;

    let subscription;
    let appStateSub;
    let cancelled = false;

    // Android: fold in whatever the foreground service and Health Connect banked
    // while the JS runtime was backgrounded or dead. Both report absolute day
    // totals, so this overwrites rather than adds — no double counting.
    const reconcileBackground = async () => {
      try {
        const entries = await collectBackgroundSteps({
          useHealthConnect: healthConnectReadyRef.current,
        });
        if (!cancelled && Object.keys(entries).length > 0) mergeDays(entries);
      } catch (err) {
        console.warn('Background step reconcile failed:', err);
      }
    };

    // iOS-only: pull the authoritative total for today from CoreMotion.
    const syncFromHistory = async () => {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const r = await Pedometer.getStepCountAsync(start, new Date());
        if (!cancelled) setTodaySteps(r.steps || 0);
      } catch (err) {
        // Android throws (unsupported) — the live watcher is the source of truth there.
      }
    };

    const init = async () => {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        if (!isAvailable) return;

        // Request (not just check) the activity-recognition permission, so the
        // watcher wires up as soon as it's granted — instead of bailing before
        // the user taps "Allow" and never retrying this session.
        let { status } = await Pedometer.getPermissionsAsync();
        if (status !== 'granted') {
          const requested = await Pedometer.requestPermissionsAsync();
          status = requested.status;
        }
        if (status !== 'granted') return;

        if (Platform.OS === 'ios') {
          // Backfill the last 7 days for any we don't already have stored.
          const entries = {};
          for (let i = 6; i >= 0; i--) {
            const day = addDays(new Date(), -i);
            const key = dateKey(day);

            const start = new Date(day);
            start.setHours(0, 0, 0, 0);
            const end = new Date(day);
            end.setHours(23, 59, 59, 999);

            try {
              const result = await Pedometer.getStepCountAsync(start, end);
              entries[key] = result.steps || 0;
            } catch (err) {
              // Leave whatever was already persisted for that day untouched
            }
          }
          if (!cancelled) mergeDays(entries);

          await syncFromHistory();
          subscription = Pedometer.watchStepCount(() => { syncFromHistory(); });
        } else {
          // Keep counting when the app is backgrounded or swiped away: the
          // foreground service holds the sensor in a surviving process, and
          // Health Connect backfills stretches neither process was alive for
          // (reboots, force-stops, days the app never opened).
          if (await isServiceSupported()) {
            await startStepService();
          }
          healthConnectReadyRef.current =
            (await isHealthConnectAvailable()) && (await requestHealthConnectPermission());
          await reconcileBackground();

          // Android: apply the watcher's per-event increment on top of whatever
          // today's total currently is. Using increments (rather than an absolute
          // base captured at subscribe time) means a reconcile from the foreground
          // service or Health Connect isn't overwritten by the next sensor tick.
          let previous = null;

          subscription = Pedometer.watchStepCount(result => {
            if (cancelled) return;
            const steps = result?.steps || 0;

            if (previous === null) {
              // First event only establishes the reference point.
              previous = steps;
              return;
            }

            const increment = steps - previous;
            previous = steps;
            // Negative means the watcher restarted; skip rather than subtract.
            if (increment > 0) setTodaySteps(v => v + increment);
          });
        }

        // Reconcile on foreground: iOS re-queries CoreMotion, Android pulls in
        // whatever the foreground service and Health Connect banked while we
        // were away (including time the process was dead entirely).
        appStateSub = AppState.addEventListener('change', state => {
          if (state !== 'active') return;
          if (Platform.OS === 'ios') {
            syncFromHistory();
          } else {
            reconcileBackground();
          }
        });
      } catch (error) {
        console.warn('Failed to initialize step tracking:', error);
      }
    };

    init();
    return () => {
      cancelled = true;
      subscription?.remove?.();
      appStateSub?.remove?.();
    };
  }, [loaded, mergeDays, setTodaySteps]);

  // ── derived aggregates, recomputed only when dailySteps changes ──

  // Last 7 days (Mon–Sun of the current week), oldest first — same shape WeeklyScreen expects
  const weeklySteps = useMemo(() => {
    const monday = startOfWeek();
    return Array.from({ length: 7 }, (_, i) => dailySteps[dateKey(addDays(monday, i))] || 0);
  }, [dailySteps]);

  // Monthly: array of { month: 'Jan', avg } for the current year, Jan -> Dec
  const monthlyTrend = useMemo(() => {
    const year = new Date().getFullYear();
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const sums = Array(12).fill(0);
    const counts = Array(12).fill(0);

    for (const [key, steps] of Object.entries(dailySteps)) {
      const d = new Date(key + 'T00:00:00');
      if (d.getFullYear() !== year) continue;
      const m = d.getMonth();
      sums[m] += steps;
      counts[m] += 1;
    }

    return monthNames.map((month, i) => ({
      month,
      avg: counts[i] ? Math.round(sums[i] / counts[i]) : 0,
      total: sums[i],
    }));
  }, [dailySteps]);

  // Stats for an arbitrary range of date keys
  const summarize = useCallback((keys) => {
    const values = keys.map(k => dailySteps[k] || 0);
    const total = values.reduce((a, b) => a + b, 0);
    const daysWithData = values.filter(v => v > 0).length || 1;
    const avg = Math.round(total / daysWithData);
    const best = values.length ? Math.max(...values) : 0;
    const goalDays = values.filter(v => v >= dailyGoal).length;
    return { total, avg, best, goalDays, days: values.length };
  }, [dailySteps, dailyGoal]);

  const weekKeys = useMemo(() => {
    const monday = startOfWeek();
    return Array.from({ length: 7 }, (_, i) => dateKey(addDays(monday, i)));
  }, [dailySteps]);

  const monthKeys = useMemo(() => {
    const now = new Date();
    return Object.keys(dailySteps).filter(k => monthKey(new Date(k + 'T00:00:00')) === monthKey(now));
  }, [dailySteps]);

  const yearKeys = useMemo(() => {
    const year = new Date().getFullYear();
    return Object.keys(dailySteps).filter(k => new Date(k + 'T00:00:00').getFullYear() === year);
  }, [dailySteps]);

  const weeklyStats = useMemo(() => summarize(weekKeys), [summarize, weekKeys]);
  const monthlyStats = useMemo(() => summarize(monthKeys), [summarize, monthKeys]);
  const yearlyStats = useMemo(() => summarize(yearKeys), [summarize, yearKeys]);

  // All-time personal records, derived from real stored data
  const records = useMemo(() => {
    const entries = Object.entries(dailySteps);
    if (entries.length === 0) {
      return { bestDay: null, longestStreak: 0, bestMonthTotal: 0, bestMonthLabel: null };
    }

    const bestDayEntry = entries.reduce((a, b) => (b[1] > a[1] ? b : a));

    // Longest streak of consecutive days hitting dailyGoal
    const sortedKeys = entries.map(([k]) => k).sort();
    let longestStreak = 0;
    let current = 0;
    let prevDate = null;
    for (const k of sortedKeys) {
      if ((dailySteps[k] || 0) >= dailyGoal) {
        const d = new Date(k + 'T00:00:00');
        if (prevDate && (d - prevDate) / 86400000 === 1) {
          current += 1;
        } else {
          current = 1;
        }
        longestStreak = Math.max(longestStreak, current);
        prevDate = d;
      } else {
        current = 0;
        prevDate = null;
      }
    }

    const monthTotals = {};
    for (const [k, steps] of entries) {
      const mk = monthKey(new Date(k + 'T00:00:00'));
      monthTotals[mk] = (monthTotals[mk] || 0) + steps;
    }
    const bestMonthEntry = Object.entries(monthTotals).reduce((a, b) => (b[1] > a[1] ? b : a));

    return {
      bestDay: { date: bestDayEntry[0], steps: bestDayEntry[1] },
      longestStreak,
      bestMonthTotal: bestMonthEntry[1],
      bestMonthLabel: bestMonthEntry[0],
    };
  }, [dailySteps, dailyGoal]);

  const value = useMemo(() => ({
    // raw + setters
    dailySteps,
    todaySteps,
    setTodaySteps,
    loaded,
    refresh,
    resetSteps,
    dailyGoal,
    setDailyGoal,
    unit,
    setUnit,

    // weekly (back-compat shape used by existing screens)
    weeklySteps,
    weeklyStats,

    // monthly / yearly
    monthlyTrend,
    monthlyStats,
    yearlyStats,

    records,
    DAILY_GOAL: dailyGoal,
  }), [dailySteps, todaySteps, setTodaySteps, loaded, refresh, resetSteps, dailyGoal, setDailyGoal, unit, setUnit, weeklySteps, weeklyStats, monthlyTrend, monthlyStats, yearlyStats, records]);

  return <StepContext.Provider value={value}>{children}</StepContext.Provider>;
}

export function useSteps() {
  const context = useContext(StepContext);
  if (!context) throw new Error('useSteps must be used within a StepProvider');
  return context;
}