package com.yourname.stepflowapp.steps

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import kotlin.math.roundToInt

/**
 * The progress ring shown as the notification's large icon.
 *
 * This is the same idea as the app's RingProgress component — an orange arc
 * sweeping a neutral track — redrawn with Canvas because notifications cannot
 * host React views or SVG. It goes in the large-icon slot, which is the only
 * place a plain (non-custom-layout) notification will render an image.
 *
 * Colours are deliberately limited to the accent plus a translucent grey. A
 * notification is drawn on a background we do not control and which flips with
 * the system theme, so anything relying on a known backdrop — a white fill, a
 * near-black label — would vanish on one of the two. Orange and 50%-alpha grey
 * both hold up on either.
 */
object StepRing {

  // Matches `primary` in src/theme/index.js.
  private const val ACCENT = "#E8552B"

  // Large icons are downscaled to roughly 64dp; rendering at 144px keeps the
  // arc smooth on high-density screens without allocating anything sizeable.
  private const val SIZE = 144

  // The notification is rebuilt on every sensor event, which while walking is
  // several times a second — but the ring only ever shows a whole percentage, so
  // almost all of those redraws would be pixel-identical. Caching on the value
  // actually rendered turns ~83KB of bitmap churn per step into one allocation
  // per percent gained.
  private var cached: Bitmap? = null
  private var cachedPercent = -1

  @Synchronized
  fun render(steps: Long, goal: Long): Bitmap {
    val percent = if (goal > 0L) {
      ((steps.toFloat() / goal.toFloat()).coerceIn(0f, 1f) * 100f).roundToInt()
    } else {
      0
    }
    cached?.let { if (percent == cachedPercent) return it }

    val bitmap = draw(percent)
    cached = bitmap
    cachedPercent = percent
    return bitmap
  }

  private fun draw(percent: Int): Bitmap {
    val bitmap = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)

    val stroke = SIZE * 0.11f
    // Inset by half the stroke so the arc's outer edge sits inside the bitmap
    // rather than being clipped along the way round.
    val inset = stroke / 2f + 2f
    val bounds = RectF(inset, inset, SIZE - inset, SIZE - inset)

    val track = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      strokeWidth = stroke
      color = Color.argb(70, 140, 140, 140)
    }
    canvas.drawOval(bounds, track)

    val progress = percent / 100f

    if (progress > 0f) {
      val arc = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = stroke
        color = Color.parseColor(ACCENT)
        strokeCap = Paint.Cap.ROUND
      }
      // Start at twelve o'clock, like the ring in the app.
      canvas.drawArc(bounds, -90f, 360f * progress, false, arc)
    }

    val label = "$percent%"
    val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.parseColor(ACCENT)
      textSize = SIZE * 0.28f
      textAlign = Paint.Align.CENTER
      isFakeBoldText = true
    }
    // Centre vertically on the glyphs themselves: baseline alignment alone sits
    // visibly low inside a ring.
    val metrics = text.fontMetrics
    val baseline = SIZE / 2f - (metrics.ascent + metrics.descent) / 2f
    canvas.drawText(label, SIZE / 2f, baseline, text)

    return bitmap
  }
}
