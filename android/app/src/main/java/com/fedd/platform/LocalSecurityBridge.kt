package com.fedd.platform

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.net.Uri
import android.os.Build
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import android.provider.DocumentsContract
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.common.LifecycleState
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

/** Native access gate and system UI coordinator. Expensive crypto never blocks the UI thread. */
internal class LocalSecurityBridge(private val context: ReactApplicationContext) : BaseActivityEventListener(), LifecycleEventListener {
  companion object {
    private val requestCounter = AtomicInteger(5410)
    private fun nextRequestCode(): Int = 5411 + Math.floorMod(requestCounter.incrementAndGet(), 50_000)
  }
  private val executor = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())
  private val vault = SecureLocalVault.get(context)
  @Volatile private var ownFlow = false
  @Volatile private var hostActive = context.lifecycleState == LifecycleState.RESUMED
  private val hostGeneration = AtomicInteger(0)
  private var pendingPicker: ((Intent?) -> Unit)? = null
  private var pendingCancellation: (() -> Unit)? = null
  private var pendingDeviceSuccess: (() -> Unit)? = null
  private var pendingDeviceFailure: (() -> Unit)? = null
  private var authSignal: CancellationSignal? = null
  private var pendingRequestCode: Int? = null

  init { context.addActivityEventListener(this); context.addLifecycleEventListener(this) }

  private fun reject(promise: Promise, error: Exception) {
    if (error is LocalSecurityException) promise.reject(error.code, error.message)
    else if (error is SecurityException) promise.reject("FOLDER_PERMISSION", "Access to this backup folder was removed. Choose the folder again.")
    else promise.reject("LOCAL_STORAGE_FAILED", "This operation could not finish. Your current data has not changed. Please try again.")
  }
  private fun run(promise: Promise, operation: () -> Any?) {
    executor.execute { try { promise.resolve(operation()) } catch (error: Exception) { reject(promise, error) } }
  }
  private fun runAsync(promise: Promise, operation: () -> Unit) {
    executor.execute { try { operation() } catch (error: Exception) { reject(promise, error) } }
  }
  fun status(promise: Promise) = run(promise) {
    Reminders.protectStoredPayloads(context)
    JSONObject().put("hasData", vault.hasData()).put("authMode", vault.authMode()).put("locked", vault.isLocked())
      .put("deviceAuthAvailable", vault.deviceAuthAvailable()).put("retryAfterMs", vault.retryAfterMs())
      .put("isSensitiveOperationActive", ownFlow).put("backupFolder", if (vault.isLocked()) JSONObject.NULL else vault.backupFolder() ?: JSONObject.NULL).toString()
  }
  fun read(promise: Promise) = run(promise) { vault.readData() }
  fun write(data: String, promise: Promise) = run(promise) { vault.writeData(data); null }
  private fun assertAuthGeneration(generation: Int) {
    if (generation != hostGeneration.get()) throw LocalSecurityException("CANCELLED", "Authentication was cancelled when FedD left the screen.")
  }
  fun unlockPin(pin: String, promise: Promise) {
    val generation = hostGeneration.get()
    run(promise) {
      assertAuthGeneration(generation)
      if (!hostActive) throw LocalSecurityException("CANCELLED", "Open FedD to unlock your profile.")
      vault.unlockPin(pin)
      assertAuthGeneration(generation)
      null
    }
  }
  fun lock(promise: Promise) = run(promise) { if (!ownFlow) vault.lock(); null }

  fun configure(mode: String, pin: String, currentPin: String, promise: Promise) {
    val generation = hostGeneration.get()
    runAsync(promise) {
      assertAuthGeneration(generation)
      if (!hostActive) throw LocalSecurityException("CANCELLED", "Open FedD to change your profile lock.")
      vault.assertUnlocked()
      val oldMode = vault.authMode()
      if (oldMode == "pin") vault.verifyCurrentPin(currentPin)
      val complete = { run(promise) { assertAuthGeneration(generation); vault.configureAuth(mode, pin); null }; Unit }
      // Enabling device authentication also proves that the configured system lock works.
      if (oldMode == "device" || mode == "device") authenticateDevice(promise, generation, complete) else complete()
    }
  }
  fun unlockDevice(promise: Promise) {
    val generation = hostGeneration.get()
    runAsync(promise) {
      assertAuthGeneration(generation)
      if (vault.authMode() != "device") throw LocalSecurityException("AUTH_UNAVAILABLE", "This profile does not use device authentication.")
      authenticateDevice(promise, generation) { run(promise) { assertAuthGeneration(generation); vault.unlockDevice(); null } }
    }
  }

  private fun beginFlow(promise: Promise, action: (Activity) -> Unit) {
    main.post {
      if (ownFlow) { promise.reject("OPERATION_BUSY", "Finish the open Android prompt first."); return@post }
      try {
        if (!hostActive) throw LocalSecurityException("ACTIVITY_UNAVAILABLE", "Open FedD and try again.")
        val activity = context.currentActivity ?: throw LocalSecurityException("ACTIVITY_UNAVAILABLE", "Open FedD and try again.")
        ownFlow = true
        action(activity)
      } catch (error: Exception) { clearFlow(); reject(promise, error) }
    }
  }
  private fun clearFlow() {
    ownFlow = false
    pendingPicker = null
    pendingCancellation = null
    pendingDeviceSuccess = null
    pendingDeviceFailure = null
    authSignal = null
    pendingRequestCode = null
  }
  private fun authenticateDevice(promise: Promise, generation: Int, success: () -> Unit) {
    if (!vault.deviceAuthAvailable()) throw LocalSecurityException("AUTH_UNAVAILABLE", "Set up a screen lock in Android Settings first.")
    beginFlow(promise) { activity ->
      assertAuthGeneration(generation)
      val onSuccess = { clearFlow(); success(); Unit }
      val onCancel = { clearFlow(); promise.reject("CANCELLED", "Authentication was cancelled."); Unit }
      pendingCancellation = onCancel
      if (Build.VERSION.SDK_INT >= 29) {
        val builder = BiometricPrompt.Builder(activity).setTitle("Unlock FedD")
          .setSubtitle("Use your fingerprint or Android screen lock")
        if (Build.VERSION.SDK_INT >= 30) builder.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL)
        else @Suppress("DEPRECATION") builder.setDeviceCredentialAllowed(true)
        val signal = CancellationSignal().also { authSignal = it }
        builder.build().authenticate(signal, activity.mainExecutor, object : BiometricPrompt.AuthenticationCallback() {
          override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            if (!ownFlow || authSignal !== signal) return
            onSuccess()
          }
          override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
            if (!ownFlow || authSignal !== signal) return
            clearFlow()
            if (!hostActive) {
              hostGeneration.incrementAndGet()
              try { vault.lock() } catch (_: Exception) { /* Keep an unavailable vault intact. */ }
            }
            if (errorCode == BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED || errorCode == BiometricPrompt.BIOMETRIC_ERROR_CANCELED)
              promise.reject("CANCELLED", "Authentication was cancelled.")
            else promise.reject("AUTH_FAILED", "Android authentication could not finish. Try again or check your device screen lock.")
          }
        })
      } else {
        // API 24-28 use the device's secure PIN/pattern/password confirmation screen.
        val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        @Suppress("DEPRECATION") val intent = keyguard.createConfirmDeviceCredentialIntent("Unlock FedD", "Confirm your Android screen lock to continue")
          ?: throw LocalSecurityException("AUTH_UNAVAILABLE", "Set up a screen lock in Android Settings first.")
        pendingDeviceSuccess = onSuccess
        pendingDeviceFailure = onCancel
        val requestCode = nextRequestCode().also { pendingRequestCode = it }
        activity.startActivityForResult(intent, requestCode)
      }
    }
  }

  fun chooseFolder(promise: Promise) = runAsync(promise) {
    vault.assertUnlocked()
    beginFlow(promise) { activity ->
      pendingCancellation = { clearFlow(); promise.reject("CANCELLED", "Folder selection was cancelled.") }
      pendingPicker = { result ->
        val uri = result?.data ?: throw LocalSecurityException("FOLDER_PERMISSION", "Choose a backup folder to continue.")
        val flags = result.flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        run(promise) {
          vault.assertUnlocked()
          if (flags and Intent.FLAG_GRANT_READ_URI_PERMISSION == 0 || flags and Intent.FLAG_GRANT_WRITE_URI_PERMISSION == 0)
            throw LocalSecurityException("FOLDER_PERMISSION", "The folder must allow FedD to read and write backups.")
          context.contentResolver.takePersistableUriPermission(uri, flags)
          val document = DocumentsContract.buildDocumentUriUsingTree(uri, DocumentsContract.getTreeDocumentId(uri))
          val name = context.contentResolver.query(document, arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME), null, null, null)?.use {
            if (it.moveToFirst()) it.getString(0) else null
          } ?: "Selected backup folder"
          val old = vault.backupFolder()?.optString("uri")
          vault.setBackupFolder(uri.toString(), name)
          if (old != null && old != uri.toString()) {
            try { context.contentResolver.releasePersistableUriPermission(Uri.parse(old), Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION) } catch (_: Exception) { /* The old grant may already be revoked. */ }
          }
          JSONObject().put("uri", uri.toString()).put("name", name).toString()
        }
      }
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).putExtra(Intent.EXTRA_LOCAL_ONLY, true)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
      val requestCode = nextRequestCode().also { pendingRequestCode = it }
      activity.startActivityForResult(intent, requestCode)
    }
  }

  fun backup(password: String, promise: Promise) = run(promise) {
    vault.assertUnlocked()
    val chars = password.toCharArray()
    val bytes = try {
      SecureCrypto.validatePassword(chars)
      val data = vault.readData() ?: throw LocalSecurityException("NO_PROFILE", "Create or restore your profile before backing up.")
      SecureCrypto.encryptBackup(data, chars)
    } finally { chars.fill('\u0000') }
    try {
      val folder = vault.backupFolder() ?: throw LocalSecurityException("NO_BACKUP_FOLDER", "Choose a backup folder first.")
      val tree = Uri.parse(folder.getString("uri"))
      val permission = context.contentResolver.persistedUriPermissions.firstOrNull { it.uri == tree }
      if (permission == null || !permission.isWritePermission || !permission.isReadPermission) throw LocalSecurityException("FOLDER_PERMISSION", "Access to this backup folder was removed. Choose the folder again.")
      val parent = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))
      val filename = "FedD-${SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(Date())}-${UUID.randomUUID().toString().take(8)}.feddbackup"
      // createDocument creates a new unique document; existing backups are never overwritten.
      val document = DocumentsContract.createDocument(context.contentResolver, parent, "application/octet-stream", filename)
        ?: throw LocalSecurityException("BACKUP_WRITE_FAILED", "The backup file could not be created. Choose another folder or free up space.")
      context.contentResolver.openOutputStream(document, "w")?.use { it.write(bytes); it.flush() }
        ?: throw LocalSecurityException("BACKUP_WRITE_FAILED", "The backup file could not be saved. Your current data has not changed.")
      filename
    } finally { bytes.fill(0) }
  }

  fun restore(password: String, promise: Promise) = runAsync(promise) {
    vault.assertUnlocked()
    val chars = password.toCharArray()
    try { SecureCrypto.validatePassword(chars) } finally { chars.fill('\u0000') }
    beginFlow(promise) { activity ->
      pendingCancellation = { clearFlow(); promise.reject("CANCELLED", "Restore was cancelled. Your current data has not changed.") }
      pendingPicker = { result ->
        val uri = result?.data ?: throw LocalSecurityException("BACKUP_INVALID", "Choose an encrypted FedD backup.")
        run(promise) {
          vault.assertUnlocked()
          val envelope = context.contentResolver.openInputStream(uri)?.use { input ->
            val output = ByteArrayOutputStream()
            val buffer = ByteArray(8192)
            var total = 0
            while (true) {
              val count = input.read(buffer)
              if (count < 0) break
              total += count
              if (total > SecureCrypto.MAX_ENVELOPE_BYTES) throw LocalSecurityException("BACKUP_INVALID", "This backup file is too large.")
              output.write(buffer, 0, count)
            }
            output.toByteArray()
          } ?: throw LocalSecurityException("BACKUP_INVALID", "This backup could not be opened.")
          val passwordChars = password.toCharArray()
          try { SecureCrypto.decryptBackup(envelope, passwordChars) }
          finally { passwordChars.fill('\u0000'); envelope.fill(0) }
        }
      }
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE)
        .putExtra(Intent.EXTRA_LOCAL_ONLY, true).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      val requestCode = nextRequestCode().also { pendingRequestCode = it }
      activity.startActivityForResult(intent, requestCode)
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (!ownFlow || requestCode != pendingRequestCode) return
    if (pendingDeviceSuccess != null) {
      val callback = if (resultCode == Activity.RESULT_OK) pendingDeviceSuccess else pendingDeviceFailure
      callback?.invoke()
      return
    }
    val callback = pendingPicker
    val cancel = pendingCancellation
    if (resultCode != Activity.RESULT_OK) { cancel?.invoke(); return }
    try { clearFlow(); callback?.invoke(data) } catch (error: Exception) {
      // URI absence is a picker failure, not a request to modify saved data.
      cancel?.invoke()
    }
  }
  override fun onHostResume() {
    hostActive = true
    // Normal picker/credential results arrive before Activity.onResume. If the
    // app was instead reopened while its external prompt is still pending,
    // cancel that abandoned flow and require a fresh unlock.
    if (pendingPicker != null || pendingDeviceSuccess != null) {
      hostGeneration.incrementAndGet()
      val cancellation = pendingCancellation
      try { vault.lock() } catch (_: Exception) { /* Never erase an unavailable vault. */ }
      cancellation?.invoke()
    }
  }
  override fun onHostPause() {
    hostActive = false
    if (!ownFlow) {
      hostGeneration.incrementAndGet()
      executor.execute { try { vault.lock() } catch (_: Exception) { /* Never reset data on an error. */ } }
    }
  }
  override fun onHostDestroy() {
    hostActive = false
    hostGeneration.incrementAndGet()
    try { vault.lock() } catch (_: Exception) { }
    authSignal?.cancel()
    pendingCancellation?.invoke()
  }
}
