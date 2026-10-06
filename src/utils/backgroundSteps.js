// Background step sources for Android.
//
// Two complementary mechanisms, because neither alone is enough:
//
//   1. Foreground service (native StepService module) — holds TYPE_STEP_COUNTER in a
//      process that outlives the JS runtime, so steps keep accruing when the app is
//      backgrounded or swiped away. Dies on reboot, and Android may still kill it.
//
//   2. Health Connect — the OS-level store other fitness apps also write to. It has
//      history we were never running for (reboots, force-stops, days the app never
//      opened), so it backfills the gaps the service leaves.
//
// Health Connect wins on conflict: it is the authoritative system-wide record, while
// our service only ever sees the stretch it happened to be alive for.
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { StepService } = NativeModules;

// ── local-time day keys, matching StepContext's "yyyy-MM-dd" shape ──
function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const isAndroid = Platform.OS === 'android';

// ── 1. foreground service ──

export async function isServiceSupported() {
  if (!isAndroid || !StepService) return false;
  try {
    return await StepService.isSupported();
  } catch {
    return false;
  }
}

/**
 * Android 13+ needs POST_NOTIFICATIONS before a foreground-service notification is
 * visible. The service still runs when it's denied — the user just loses the live
 * step readout in the shade — so a refusal is not fatal.
 */
async function ensureNotificationPermission() {
  if (Platform.Version < 33) return;
  try {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  } catch {
    // non-fatal
  }
}

export async function startStepService() {
  if (!isAndroid || !StepService) return false;
  try {
    await ensureNotificationPermission();
    return await StepService.start();
  } catch (err) {
    console.warn('Could not start step service:', err);
    return false;
  }
}

export async function stopStepService() {
  if (!isAndroid || !StepService) return false;
  try {
    return await StepService.stop();
  } catch (err) {
    console.warn('Could not stop step service:', err);
    return false;
  }
}

/** Day totals the native service accumulated: { "2026-08-18": 5231, ... } */
/**
 * Mirror the distance unit into the native store.
 *
 * The foreground service renders distance in its notification, and native code
 * cannot read AsyncStorage where StepContext keeps the preference — so it has to
 * be pushed across whenever it changes.
 */
export async function setServiceUnit(unit) {
  if (!isAndroid || !StepService?.setUnit) return false;
  try {
    return await StepService.setUnit(unit);
  } catch {
    return false;
  }
}

/**
 * Mirror the daily step goal into the native store, so the notification's
 * progress ring fills against the same target the app shows.
 */
export async function setServiceGoal(goal) {
  if (!isAndroid || !StepService?.setGoal) return false;
  try {
    return await StepService.setGoal(goal);
  } catch {
    return false;
  }
}

export async function getServiceSteps() {
  if (!isAndroid || !StepService) return {};
  try {
    const json = await StepService.getDailySteps();
    const parsed = JSON.parse(json || '{}');
    // JSON values arrive as numbers already, but be defensive about strings.
    return Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k, Number(v) || 0])
    );
  } catch (err) {
    console.warn('Could not read service steps:', err);
    return {};
  }
}

// ── 2. Health Connect ──

// Required lazily: the module touches native code on import, and we want a device
// without Health Connect to degrade quietly rather than crash at startup.
function healthConnect() {
  try {
    return require('react-native-health-connect');
  } catch {
    return null;
  }
}

const STEPS_PERMISSION = { accessType: 'read', recordType: 'Steps' };

export async function isHealthConnectAvailable() {
  if (!isAndroid) return false;
  const hc = healthConnect();
  if (!hc) return false;
  try {
    const status = await hc.getSdkStatus();
    return status === hc.SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

/** Prompts for Health Connect read access. Returns whether we ended up with it. */
export async function requestHealthConnectPermission() {
  const hc = healthConnect();
  if (!hc) return false;
  try {
    if (!(await hc.initialize())) return false;

    const granted = await hc.getGrantedPermissions();
    const has = (list) =>
      Array.isArray(list) &&
      list.some(p => p.recordType === 'Steps' && p.accessType === 'read');

    if (has(granted)) return true;
    return has(await hc.requestPermission([STEPS_PERMISSION]));
  } catch (err) {
    console.warn('Health Connect permission request failed:', err);
    return false;
  }
}

/**
 * Per-day step totals from Health Connect for the last `days` days.
 *
 * Records are bucketed by the local day their interval starts in. A walk that
 * crosses midnight is attributed to the day it began — a rare enough case that
 * splitting it isn't worth the complexity.
 */
export async function getHealthConnectSteps(days = 30) {
  const hc = healthConnect();
  if (!hc) return {};
  try {
    if (!(await hc.initialize())) return {};

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const result = await hc.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });

    const records = result?.records || [];
    const totals = {};
    for (const r of records) {
      const key = dateKey(new Date(r.startTime));
      totals[key] = (totals[key] || 0) + (Number(r.count) || 0);
    }
    return totals;
  } catch (err) {
    console.warn('Could not read Health Connect steps:', err);
    return {};
  }
}

/**
 * Merge both background sources into one { day: steps } map.
 *
 * Health Connect overwrites the service's figure for any day it knows about, since
 * it also captured the periods our service was dead for.
 */
export async function collectBackgroundSteps({ useHealthConnect = true, days = 30 } = {}) {
  if (!isAndroid) return {};

  const fromService = await getServiceSteps();
  if (!useHealthConnect) return fromService;

  const fromHealth = await getHealthConnectSteps(days);
  return { ...fromService, ...fromHealth };
}
