package com.yourname.stepflowapp.steps

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Per-day step totals, owned by the native side so they survive the JS runtime
 * being torn down.
 *
 * Keys are local-time "yyyy-MM-dd" strings, matching the shape StepContext already
 * persists in AsyncStorage, so the two merge without translation.
 */
object StepStore {

  private const val PREFS = "stepflow_steps"
  private const val KEY_DAYS = "days_json"
  private const val KEY_LAST_CUMULATIVE = "last_cumulative"
  private const val KEY_UNIT = "unit"
  private const val KEY_GOAL = "daily_goal"

  private const val DEFAULT_GOAL = 10000L

  const val UNIT_METRIC = "Metric"
  const val UNIT_IMPERIAL = "Imperial"

  private fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun dayKey(date: Date = Date()): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(date)

  private fun readDays(p: SharedPreferences): JSONObject =
    try {
      JSONObject(p.getString(KEY_DAYS, "{}") ?: "{}")
    } catch (e: Exception) {
      JSONObject()
    }

  /**
   * Fold one cumulative sensor reading into today's bucket, returning today's total.
   *
   * TYPE_STEP_COUNTER counts from boot, so consecutive readings differ by the steps
   * actually taken in between — that difference is what we add. Two edge cases:
   *   - first reading ever (or after a restart): no baseline, so bank nothing and
   *     just record where the counter currently sits
   *   - reading went backwards: the device rebooted and the counter reset, so treat
   *     the whole new value as fresh steps
   */
  @Synchronized
  fun record(context: Context, cumulative: Long): Long {
    val p = prefs(context)
    val last = p.getLong(KEY_LAST_CUMULATIVE, -1L)

    val delta = when {
      last < 0L -> 0L              // no baseline yet
      cumulative < last -> cumulative // counter reset (reboot)
      else -> cumulative - last
    }

    val days = readDays(p)
    val today = dayKey()
    val updated = days.optLong(today, 0L) + delta
    days.put(today, updated)

    p.edit()
      .putString(KEY_DAYS, days.toString())
      .putLong(KEY_LAST_CUMULATIVE, cumulative)
      .apply()

    return updated
  }

  /**
   * The user's distance unit, mirrored here from JS.
   *
   * StepContext is the owner and persists it to AsyncStorage, which native code
   * cannot read — so JS pushes it across whenever it changes and the foreground
   * service reads this copy when it renders the notification.
   */
  fun unit(context: Context): String =
    prefs(context).getString(KEY_UNIT, UNIT_METRIC) ?: UNIT_METRIC

  fun setUnit(context: Context, unit: String) {
    prefs(context).edit().putString(KEY_UNIT, unit).apply()
  }

  /** Today's step goal, mirrored from JS for the same reason as [unit]. */
  fun goal(context: Context): Long =
    prefs(context).getLong(KEY_GOAL, DEFAULT_GOAL)

  fun setGoal(context: Context, goal: Long) {
    prefs(context).edit().putLong(KEY_GOAL, goal).apply()
  }

  /**
   * Distance for a step count, in the user's unit.
   *
   * Factors match the ones the JS screens use (see HomeScreen/StatsScreen), so the
   * notification and the app never disagree about the same day.
   */
  fun distance(context: Context, steps: Long): Double {
    val factor = if (unit(context) == UNIT_IMPERIAL) 0.0004736 else 0.000762
    return steps * factor
  }

  fun distanceLabel(context: Context): String =
    if (unit(context) == UNIT_IMPERIAL) "mi" else "km"

  fun todaySteps(context: Context): Long =
    readDays(prefs(context)).optLong(dayKey(), 0L)

  /** Every stored day, as a JSON string for the JS bridge. */
  fun allDaysJson(context: Context): String =
    readDays(prefs(context)).toString()

  /**
   * Overwrite a day's total. Used when Health Connect reports an authoritative
   * figure that should win over our own accumulation.
   */
  @Synchronized
  fun setDay(context: Context, day: String, steps: Long) {
    val p = prefs(context)
    val days = readDays(p)
    days.put(day, steps)
    p.edit().putString(KEY_DAYS, days.toString()).apply()
  }
}
