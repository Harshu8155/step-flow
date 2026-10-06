package com.yourname.stepflowapp.steps

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** JS-facing control surface for the step foreground service. */
class StepServiceModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "StepService"

  /** False on devices with no hardware step counter — JS should not offer the toggle. */
  @ReactMethod
  fun isSupported(promise: Promise) {
    try {
      val sm = reactApplicationContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
      promise.resolve(sm?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun start(promise: Promise) {
    try {
      StepCounterService.start(reactApplicationContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_START", e.message, e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      StepCounterService.stop(reactApplicationContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_STOP", e.message, e)
    }
  }

  /** All natively-accumulated day totals as a JSON string: {"2026-08-18": 5231, ...}. */
  @ReactMethod
  fun getDailySteps(promise: Promise) {
    try {
      promise.resolve(StepStore.allDaysJson(reactApplicationContext))
    } catch (e: Exception) {
      promise.reject("E_READ", e.message, e)
    }
  }

  /**
   * Mirror the JS-side distance unit so the foreground service notification can
   * render distance without reading AsyncStorage, which native code cannot do.
   */
  @ReactMethod
  fun setUnit(unit: String, promise: Promise) {
    try {
      StepStore.setUnit(reactApplicationContext, unit)
      // Re-render straight away; the step count has not changed but the distance
      // reads differently, and waiting for the next step would look broken.
      StepCounterService.refresh(reactApplicationContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_UNIT", e.message, e)
    }
  }

  /**
   * Mirror the JS-side daily step goal, so the notification's progress ring
   * fills against the same target the app shows.
   */
  @ReactMethod
  fun setGoal(goal: Double, promise: Promise) {
    try {
      StepStore.setGoal(reactApplicationContext, goal.toLong())
      StepCounterService.refresh(reactApplicationContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_GOAL", e.message, e)
    }
  }

  /** Let an authoritative source (Health Connect) overwrite a day. */
  @ReactMethod
  fun setDay(day: String, steps: Double, promise: Promise) {
    try {
      StepStore.setDay(reactApplicationContext, day, steps.toLong())
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_WRITE", e.message, e)
    }
  }
}
