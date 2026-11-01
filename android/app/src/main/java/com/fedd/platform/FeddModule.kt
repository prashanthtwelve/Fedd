package com.fedd.platform

import android.app.AlarmManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = FeddModule.NAME)
class FeddModule(private val context: ReactApplicationContext) : NativeFeddSpec(context) {
  private val security = LocalSecurityBridge(context)
  companion object { const val NAME = "FeddPlatform" }
  override fun getName() = NAME
  override fun getLocalSecurityStatus(promise: Promise) { security.status(promise) }
  override fun readSecureData(promise: Promise) { security.read(promise) }
  override fun writeSecureData(data: String, promise: Promise) { security.write(data, promise) }
  override fun configureLocalAuth(mode: String, pin: String, currentPin: String, promise: Promise) { security.configure(mode, pin, currentPin, promise) }
  override fun unlockWithPin(pin: String, promise: Promise) { security.unlockPin(pin, promise) }
  override fun unlockWithDevice(promise: Promise) { security.unlockDevice(promise) }
  override fun lockLocalData(promise: Promise) { security.lock(promise) }
  override fun chooseBackupFolder(promise: Promise) { security.chooseFolder(promise) }
  override fun writeEncryptedBackup(password: String, promise: Promise) { security.backup(password, promise) }
  override fun readEncryptedBackup(password: String, promise: Promise) { security.restore(password, promise) }
  override fun scheduleReminder(payload: String, promise: Promise) {
    try { promise.resolve(Reminders.schedule(context, payload)) }
    catch (error: Exception) { promise.reject("REMINDER_FAILED", error) }
  }
  override fun cancelReminder(promise: Promise) {
    try { Reminders.cancel(context); promise.resolve(null) }
    catch (error: Exception) { promise.reject("CANCEL_FAILED", error) }
  }
  override fun cancelFollowUp(id: String, endTimestamp: Double, promise: Promise) {
    try { Reminders.cancelFollowUp(context, id, endTimestamp.toLong()); promise.resolve(null) }
    catch (error: Exception) { promise.reject("CANCEL_FAILED", error) }
  }
  override fun notificationsEnabled(channelId: String, promise: Promise) {
    try { promise.resolve(Reminders.enabled(context, channelId)) }
    catch (error: Exception) { promise.reject("PERMISSION_CHECK_FAILED", error) }
  }
  override fun openNotificationSettings(promise: Promise) {
    try {
      val intent = if (Build.VERSION.SDK_INT >= 26) Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      else Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); promise.resolve(null)
    } catch (error: Exception) { promise.reject("SETTINGS_FAILED", error) }
  }
  override fun openInstagramUrl(url: String, promise: Promise) {
    val uri = Uri.parse(url)
    if (uri.scheme != "https" || uri.host != "www.instagram.com") {
      promise.resolve(false); return
    }
    try {
      val intent = Intent(Intent.ACTION_VIEW, uri).setPackage("com.instagram.android").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent); promise.resolve(true)
    } catch (_: Exception) { promise.resolve(false) }
  }
  override fun openInstagramHome(promise: Promise) {
    try {
      val intent = context.packageManager.getLaunchIntentForPackage("com.instagram.android")
      if (intent == null) { promise.resolve(false); return }
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); promise.resolve(true)
    } catch (_: Exception) { promise.resolve(false) }
  }
  override fun openAlarmSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= 31) {
        context.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      promise.resolve(null)
    } catch (error: Exception) { promise.reject("SETTINGS_FAILED", error) }
  }
}
