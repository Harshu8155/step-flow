package com.yourname.stepflowapp.steps

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import com.yourname.stepflowapp.MainActivity
import com.yourname.stepflowapp.R
import java.text.NumberFormat
import java.util.Locale

/**
 * Foreground service that keeps counting steps while the app is backgrounded or
 * swiped away.
 *
 * Android's TYPE_STEP_COUNTER is cumulative since the last device boot and keeps
 * ticking in hardware regardless of what our process is doing. The problem is only
 * that a plain JS subscription dies with the process — so we hold the sensor from a
 * foreground service instead and write per-day totals into SharedPreferences, where
 * the JS side can pick them up on next launch.
 *
 * Deltas, not absolutes: we store the last cumulative reading and add only the
 * difference to today's bucket, so a reboot (counter resets to 0) or a day rollover
 * never corrupts the running total.
 */
class StepCounterService : Service(), SensorEventListener {

  private var sensorManager: SensorManager? = null
  private var stepSensor: Sensor? = null

  companion object {
    const val CHANNEL_ID = "stepflow_step_counter"
    const val NOTIFICATION_ID = 4711

    /**
     * Whether the service is currently up. Only used to decide whether a refresh
     * request from JS should post — calling notify() for a foreground
     * notification while the service is stopped would leave a stray, permanent
     * notification with nothing behind it.
     */
    @Volatile
    private var running = false

    fun start(context: Context) {
      val intent = Intent(context, StepCounterService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, StepCounterService::class.java))
    }

    /**
     * Re-render the notification without waiting for the next step.
     *
     * Called when the unit preference changes: the numbers themselves have not
     * moved, but "6.4 km" needs to become "4.0 mi" immediately rather than
     * whenever the user next takes a step.
     */
    fun refresh(context: Context) {
      if (!running) return
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      manager?.notify(NOTIFICATION_ID, buildNotification(context, StepStore.todaySteps(context)))
    }

    /**
     * Notification content: today's steps and the distance they represent.
     *
     * Lives in the companion so both the running service and a refresh triggered
     * from JS build exactly the same thing.
     */
    fun buildNotification(context: Context, steps: Long): Notification {
      val launchIntent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      } else {
        PendingIntent.FLAG_UPDATE_CURRENT
      }
      val pending = PendingIntent.getActivity(context, 0, launchIntent, flags)

      val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(context, CHANNEL_ID)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(context)
      }

      // Grouped thousands: a bare "8432" is noticeably harder to read at a glance
      // in a status bar than "8,432".
      val prettySteps = NumberFormat.getIntegerInstance().format(steps)
      val distance = StepStore.distance(context, steps)
      val prettyDistance = String.format(Locale.getDefault(), "%.1f", distance)
      val unitLabel = StepStore.distanceLabel(context)
      val goal = StepStore.goal(context)

      return builder
        .setContentTitle("$prettySteps steps today")
        .setContentText("$prettyDistance $unitLabel walked")
        .setSmallIcon(R.mipmap.ic_launcher_foreground)
        // Goal progress as a ring, in the only slot a plain notification can
        // render an image.
        .setLargeIcon(StepRing.render(steps, goal))
        .setContentIntent(pending)
        .setOngoing(true)
        .build()
    }
  }

  override fun onCreate() {
    super.onCreate()
    createChannel()
    running = true
    startForeground(NOTIFICATION_ID, buildNotification(this, StepStore.todaySteps(this)))

    sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
    stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

    if (stepSensor == null) {
      // No hardware step counter — nothing useful to do, don't hold a notification.
      stopSelf()
      return
    }

    sensorManager?.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_NORMAL)
  }

  // Restart if Android kills us for memory; the sensor is cumulative so we lose nothing.
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    running = false
    sensorManager?.unregisterListener(this)
    super.onDestroy()
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

  override fun onSensorChanged(event: SensorEvent?) {
    val cumulative = event?.values?.firstOrNull() ?: return
    val today = StepStore.record(this, cumulative.toLong())
    updateNotification(today)
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Step tracking",
      // Low: no sound, no heads-up — it's an ambient status notification.
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Keeps counting your steps while StepFlow is closed"
      setShowBadge(false)
    }
    val manager = getSystemService(NotificationManager::class.java)
    manager?.createNotificationChannel(channel)
  }

  private fun updateNotification(steps: Long) {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    manager?.notify(NOTIFICATION_ID, buildNotification(this, steps))
  }
}
