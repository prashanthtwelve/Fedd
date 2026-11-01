package com.fedd.platform

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import org.json.JSONObject
import com.fedd.MainActivity
import com.fedd.R

object Reminders {
  private const val PRIMARY = 310
  private const val FOLLOW_UP = 311
  private const val TEST = 312
  private const val PREFS = "fedd_reminder"
  private val vibration = longArrayOf(0, 250, 150, 250)
  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  private fun readPayload(context: Context, name: String): String? {
    val preferences = prefs(context)
    val vault = SecureLocalVault.get(context)
    preferences.getString("${name}Encrypted", null)?.let {
      val payload = vault.openReminderPayload(it)
      if (preferences.contains(name)) preferences.edit().remove(name).commit()
      return payload
    }
    val legacy = preferences.getString(name, null) ?: return null
    // Commit encrypted data before removing a legacy plaintext value. If secure
    // storage is unavailable, preserve the existing session and its reminder.
    try {
      val encrypted = vault.sealReminderPayload(legacy)
      if (!preferences.edit().putString("${name}Encrypted", encrypted).remove(name).commit())
        throw IllegalStateException("Reminder migration failed")
    } catch (_: Exception) { /* The legacy session remains available for recovery. */ }
    return legacy
  }
  @Synchronized fun protectStoredPayloads(context: Context) {
    readPayload(context, "payload")
    readPayload(context, "testPayload")
  }
  private fun slot(kind: String) = when (kind) { "followUp" -> FOLLOW_UP; "test" -> TEST; else -> PRIMARY }
  private fun key(json: JSONObject) = "${json.getString("id")}:${json.getDouble("endTimestamp").toLong()}"
  private fun alarmIntent(context: Context, kind: String, token: String = "") = PendingIntent.getBroadcast(
    context, slot(kind), Intent(context, ReminderReceiver::class.java).putExtra("kind", kind).putExtra("key", token),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  private fun mode(context: Context): String {
    val alarm = context.getSystemService(AlarmManager::class.java)
    return if (Build.VERSION.SDK_INT < 31 || alarm.canScheduleExactAlarms()) "exact" else "inexact"
  }
  private fun setAlarm(context: Context, at: Long, kind: String, token: String): String {
    val alarm = context.getSystemService(AlarmManager::class.java)
    val pending = alarmIntent(context, kind, token)
    val triggerAt = maxOf(at, System.currentTimeMillis() + 500)
    if (mode(context) == "exact") {
      try { alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending); return "exact" }
      catch (_: SecurityException) { /* Permission may have been revoked during scheduling. */ }
    }
    alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
    return "inexact"
  }
  private fun cancelSlot(context: Context, kind: String) {
    context.getSystemService(AlarmManager::class.java).cancel(alarmIntent(context, kind))
    context.getSystemService(NotificationManager::class.java).cancel(slot(kind))
  }
  private fun createChannels(context: Context, json: JSONObject) {
    if (Build.VERSION.SDK_INT < 26) return
    val manager = context.getSystemService(NotificationManager::class.java)
    val names = json.getJSONArray("channels")
    for (i in 0 until names.length()) {
      val item = names.getJSONObject(i)
      val id = item.getString("id")
      val importance = when (id) {
        "fedd_nudge_gentle" -> NotificationManager.IMPORTANCE_DEFAULT
        "fedd_nudge_firm" -> NotificationManager.IMPORTANCE_HIGH
        "fedd_nudge_silent" -> NotificationManager.IMPORTANCE_LOW
        else -> throw IllegalArgumentException("Unknown nudge channel")
      }
      if (manager.getNotificationChannel(id) != null) continue
      val channel = NotificationChannel(id, item.getString("name"), importance)
      channel.description = item.getString("description")
      val firm = id == "fedd_nudge_firm"
      channel.enableVibration(firm)
      if (firm) channel.vibrationPattern = vibration
      if (id == "fedd_nudge_silent") channel.setSound(null, null)
      else channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
        AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
      manager.createNotificationChannel(channel)
    }
  }
  @Synchronized fun schedule(context: Context, payload: String): String {
    val json = JSONObject(payload)
    val at = json.getDouble("endTimestamp").toLong()
    require(at > 0 && json.getString("id").isNotEmpty())
    require(json.getString("channelId") in listOf("fedd_nudge_gentle", "fedd_nudge_firm", "fedd_nudge_silent"))
    createChannels(context, json)
    val preferences = prefs(context)
    val encryptedPayload = SecureLocalVault.get(context).sealReminderPayload(payload)
    if (json.optBoolean("test")) {
      check(preferences.edit().putString("testPayloadEncrypted", encryptedPayload).remove("testPayload").putBoolean("testDelivered", false).commit())
      cancelSlot(context, "test")
      return setAlarm(context, at, "test", key(json))
    }
    val previous = readPayload(context, "payload")?.let { JSONObject(it) }
    if (previous != null && key(previous) == key(json) && previous.optString("channelId") == json.getString("channelId")) {
      if (json.optBoolean("checkedIn")) cancelFollowUp(context, json.getString("id"), at)
      return preferences.getString("mode", mode(context)) ?: mode(context)
    }
    val checkedIn = json.optBoolean("checkedIn") || preferences.getString("acknowledged", null) == key(json)
    check(preferences.edit().putString("payloadEncrypted", encryptedPayload).remove("payload").putBoolean("primaryDelivered", false)
      .putBoolean("followUpDelivered", false).putBoolean("checkedIn", checkedIn).commit())
    cancelSlot(context, "primary")
    cancelSlot(context, "followUp")
    val primaryMode = setAlarm(context, at, "primary", key(json))
    val followUp = json.optJSONObject("followUp")
    val followMode = if (!checkedIn && followUp != null) setAlarm(context, followUp.getDouble("at").toLong(), "followUp", key(json)) else primaryMode
    val result = if (primaryMode == "inexact" || followMode == "inexact") "inexact" else "exact"
    preferences.edit().putString("mode", result).commit()
    return result
  }
  @Synchronized fun cancelFollowUp(context: Context, id: String, at: Long) {
    val token = "$id:$at"
    val preferences = prefs(context)
    preferences.edit().putString("acknowledged", token).commit()
    val json = readPayload(context, "payload")?.let { JSONObject(it) } ?: return
    if (key(json) != token) return
    preferences.edit().putBoolean("checkedIn", true).commit()
    cancelSlot(context, "followUp")
  }
  @Synchronized fun cancel(context: Context) {
    cancelSlot(context, "primary")
    cancelSlot(context, "followUp")
    // Test alarms are independent of real sessions.
    prefs(context).edit().remove("payload").remove("payloadEncrypted").remove("primaryDelivered").remove("followUpDelivered")
      .remove("checkedIn").remove("acknowledged").remove("mode").commit()
  }
  @Synchronized fun restore(context: Context) {
    val preferences = prefs(context)
    try {
      val payload = readPayload(context, "payload") ?: return
      val json = JSONObject(payload)
      createChannels(context, json)
      if (!preferences.getBoolean("primaryDelivered", false)) setAlarm(context, json.getDouble("endTimestamp").toLong(), "primary", key(json))
      val followUp = json.optJSONObject("followUp")
      if (followUp != null && !preferences.getBoolean("checkedIn", false) && !preferences.getBoolean("followUpDelivered", false)) {
        setAlarm(context, followUp.getDouble("at").toLong(), "followUp", key(json))
      }
    } catch (_: Exception) { /* Saved JS deadline still recovers the session. */ }
  }
  fun enabled(context: Context, channelId: String): Boolean {
    if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false
    val manager = context.getSystemService(NotificationManager::class.java)
    if (!manager.areNotificationsEnabled()) return false
    return Build.VERSION.SDK_INT < 26 || manager.getNotificationChannel(channelId)?.importance != NotificationManager.IMPORTANCE_NONE
  }
  @Synchronized fun dismissTest(context: Context) {
    context.getSystemService(NotificationManager::class.java).cancel(TEST)
  }
  @Synchronized fun deliver(context: Context, kind: String, expectedKey: String) {
    val preferences = prefs(context)
    val payload = readPayload(context, if (kind == "test") "testPayload" else "payload") ?: return
    val json = JSONObject(payload)
    if (key(json) != expectedKey || preferences.getBoolean("${kind}Delivered", false)) return
    if (kind == "followUp" && preferences.getBoolean("checkedIn", false)) return
    val config = if (kind == "followUp") json.optJSONObject("followUp") ?: return else json
    val at = if (kind == "followUp") config.getDouble("at").toLong() else json.getDouble("endTimestamp").toLong()
    if (at > System.currentTimeMillis() + 500) { setAlarm(context, at, kind, expectedKey); return }
    preferences.edit().putBoolean("${kind}Delivered", true).commit()
    val channelId = json.getString("channelId")
    if (!enabled(context, channelId)) return
    createChannels(context, json)
    val click = Intent(context, MainActivity::class.java).setAction(Intent.ACTION_VIEW)
      .setData(Uri.parse("fedd://checkin/${Uri.encode(json.getString("id"))}"))
      .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    // A test tap only dismisses its notification; it cannot navigate to a real session.
    val tap = if (kind == "test") PendingIntent.getBroadcast(context, TEST,
      Intent(context, ReminderReceiver::class.java).setAction("com.fedd.DISMISS_TEST_NUDGE").putExtra("kind", "dismissTest"),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    else PendingIntent.getActivity(context, slot(kind), click, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, channelId) else Notification.Builder(context)
    val style = json.getString("style")
    val body = config.getString("body")
    builder.setSmallIcon(R.drawable.ic_notification).setContentTitle(config.getString("title"))
      .setContentText(body).setStyle(Notification.BigTextStyle().bigText(body).setBigContentTitle(config.getString("title")))
      .setContentIntent(tap).setAutoCancel(true).setCategory(Notification.CATEGORY_REMINDER)
    if (Build.VERSION.SDK_INT < 26) {
      builder.setPriority(if (style == "firm") Notification.PRIORITY_HIGH else if (style == "silent") Notification.PRIORITY_LOW else Notification.PRIORITY_DEFAULT)
      if (style != "silent") builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
      if (style == "firm") builder.setVibrate(vibration)
    }
    context.getSystemService(NotificationManager::class.java).notify(slot(kind), builder.build())
  }
}
class ReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    try {
      if (intent.getStringExtra("kind") == "dismissTest") Reminders.dismissTest(context)
      else Reminders.deliver(context, intent.getStringExtra("kind") ?: "primary", intent.getStringExtra("key") ?: "")
    }
    catch (_: Exception) { /* End-time recovery remains available. */ }
  }
}
class ReminderBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action in listOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED, AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED)) Reminders.restore(context)
  }
}
