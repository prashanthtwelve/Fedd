package com.fedd.platform

import android.app.KeyguardManager
import android.content.Context
import android.os.SystemClock
import android.provider.Settings
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** App-private, atomic AES-GCM files with a non-exportable Android Keystore key. */
internal class SecureLocalVault private constructor(private val context: Context) {
  companion object {
    private const val KEY_ALIAS = "fedd.local.vault.v1"
    private val MAGIC = byteArrayOf(70, 69, 68, 68, 1)
    @Volatile private var instance: SecureLocalVault? = null
    fun get(context: Context): SecureLocalVault = instance ?: synchronized(this) {
      instance ?: SecureLocalVault(context.applicationContext).also { instance = it }
    }
  }

  private val dataFile = AtomicFile(File(context.noBackupFilesDir, "fedd-data.secure"))
  private val metadataFile = AtomicFile(File(context.noBackupFilesDir, "fedd-security.secure"))
  private var metadata: JSONObject? = null
  private var unlocked = false

  private fun exists(file: AtomicFile) = file.baseFile.exists() || File(file.baseFile.path + ".bak").exists()

  private fun encryptionKey(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    val existing = store.getKey(KEY_ALIAS, null)
    if (existing is SecretKey) return existing
    // A lost/invalidated key must never silently erase or replace existing data.
    val reminderPrefs = context.getSharedPreferences("fedd_reminder", Context.MODE_PRIVATE)
    if (exists(dataFile) || exists(metadataFile) || reminderPrefs.contains("payloadEncrypted") || reminderPrefs.contains("testPayloadEncrypted"))
      throw LocalSecurityException("KEY_UNAVAILABLE", "Android secure storage is unavailable. Keep your data intact and restore an encrypted backup if needed.")
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    generator.init(KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
      .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
      .setRandomizedEncryptionRequired(true).setKeySize(256).build())
    return generator.generateKey()
  }

  private fun readEncrypted(file: AtomicFile, domain: String): ByteArray? {
    if (!exists(file)) return null
    try {
      if (file.baseFile.length() > SecureCrypto.MAX_DATA_BYTES + 1024) throw IllegalArgumentException("Too large")
      val envelope = file.readFully()
      if (envelope.size < MAGIC.size + 12 + 16 || !envelope.copyOfRange(0, MAGIC.size).contentEquals(MAGIC))
        throw IllegalArgumentException("Invalid secure data")
      val nonce = envelope.copyOfRange(MAGIC.size, MAGIC.size + 12)
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, encryptionKey(), GCMParameterSpec(128, nonce))
      cipher.updateAAD(domain.toByteArray(Charsets.UTF_8))
      return cipher.doFinal(envelope.copyOfRange(MAGIC.size + 12, envelope.size))
    } catch (error: LocalSecurityException) { throw error }
    catch (_: Exception) { throw LocalSecurityException("SECURE_STORAGE_FAILED", "Your saved data could not be opened securely. It has not been changed.") }
  }

  private fun writeEncrypted(file: AtomicFile, domain: String, plaintext: ByteArray) {
    if (plaintext.size > SecureCrypto.MAX_DATA_BYTES) throw LocalSecurityException("DATA_TOO_LARGE", "Your saved data is too large.")
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, encryptionKey())
    cipher.updateAAD(domain.toByteArray(Charsets.UTF_8))
    val bytes = MAGIC + cipher.iv + cipher.doFinal(plaintext)
    var output: java.io.FileOutputStream? = null
    try {
      output = file.startWrite()
      output.write(bytes)
      file.finishWrite(output)
    } catch (error: Exception) {
      if (output != null) file.failWrite(output)
      throw LocalSecurityException("SECURE_STORAGE_FAILED", "Your data could not be saved securely. Please try again.")
    } finally { bytes.fill(0) }
  }

  private fun config(): JSONObject {
    metadata?.let { return it }
    val raw = readEncrypted(metadataFile, "fedd-security-v1")
    val loaded = if (raw == null) JSONObject().put("version", 1).put("authMode", "none") else try {
      JSONObject(raw.toString(Charsets.UTF_8)).also {
        require(it.getInt("version") == 1 && it.getString("authMode") in listOf("none", "pin", "device"))
      }
    } catch (_: Exception) {
      throw LocalSecurityException("SECURE_STORAGE_FAILED", "Your security settings could not be read. Your saved data has not changed.")
    } finally { raw.fill(0) }
    metadata = loaded
    unlocked = loaded.getString("authMode") == "none"
    return loaded
  }

  private fun saveConfig(next: JSONObject) {
    val bytes = next.toString().toByteArray(Charsets.UTF_8)
    try { writeEncrypted(metadataFile, "fedd-security-v1", bytes); metadata = next }
    finally { bytes.fill(0) }
  }

  @Synchronized fun authMode(): String = config().getString("authMode")
  @Synchronized fun assertUnlocked() {
    config()
    if (!unlocked) throw LocalSecurityException("LOCKED", "Unlock your profile to continue.")
  }
  @Synchronized fun lock() { config(); if (authMode() != "none") unlocked = false }
  @Synchronized fun isLocked(): Boolean { config(); return !unlocked }
  @Synchronized fun hasData(): Boolean = exists(dataFile)
  private fun bootCount(): Int = Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)
  @Synchronized fun retryAfterMs(): Long {
    val settings = config()
    val delay = settings.optLong("pinDelayMs")
    if (delay <= 0) return maxOf(0L, settings.optLong("pinLockedUntil") - System.currentTimeMillis())
    val boot = bootCount()
    if (boot != settings.optInt("pinLockBoot", -2) || settings.optLong("pinLockedElapsed") - SystemClock.elapsedRealtime() > delay) {
      // Preserve throttling across a reboot without trusting a manually changed
      // wall clock. A still-active delay starts once on the new boot.
      saveConfig(JSONObject(settings.toString()).put("pinLockBoot", boot)
        .put("pinLockedElapsed", SystemClock.elapsedRealtime() + delay))
      return delay
    }
    val remaining = maxOf(0L, settings.optLong("pinLockedElapsed") - SystemClock.elapsedRealtime())
    if (remaining == 0L) saveConfig(JSONObject(settings.toString()).put("pinDelayMs", 0L).put("pinLockedUntil", 0L))
    return remaining
  }
  fun deviceAuthAvailable(): Boolean = (context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isDeviceSecure

  private fun verifyPin(pin: String) {
    val settings = config()
    val remaining = retryAfterMs()
    if (remaining > 0) throw LocalSecurityException("PIN_THROTTLED", "Please wait ${maxOf(1L, (remaining + 999) / 1000)} seconds before trying again.")
    val chars = pin.toCharArray()
    val matches = try {
      pin.matches(Regex("^[0-9]{6,12}$")) && SecureCrypto.pinMatches(chars,
        SecureCrypto.decode(settings.getString("pinSalt")), SecureCrypto.decode(settings.getString("pinVerifier")))
    } finally { chars.fill('\u0000') }
    val next = JSONObject(settings.toString())
    if (!matches) {
      val failures = minOf(30, settings.optInt("pinFailures") + 1)
      val delay = if (failures < 5) 0L else minOf(3_600_000L, 30_000L * (1L shl minOf(7, failures - 5)))
      next.put("pinFailures", failures).put("pinLockedUntil", System.currentTimeMillis() + delay)
        .put("pinDelayMs", delay).put("pinLockBoot", bootCount()).put("pinLockedElapsed", SystemClock.elapsedRealtime() + delay)
      saveConfig(next)
      throw LocalSecurityException("PIN_INCORRECT", if (delay == 0L) "That PIN did not match. Try again." else "That PIN did not match. Please wait ${delay / 1000} seconds before trying again.")
    }
    next.put("pinFailures", 0).put("pinLockedUntil", 0L).put("pinDelayMs", 0L)
    saveConfig(next)
  }

  @Synchronized fun unlockPin(pin: String) {
    if (authMode() != "pin") throw LocalSecurityException("AUTH_UNAVAILABLE", "This profile does not use a PIN.")
    verifyPin(pin)
    unlocked = true
  }
  @Synchronized fun unlockDevice() {
    if (authMode() != "device") throw LocalSecurityException("AUTH_UNAVAILABLE", "This profile does not use device authentication.")
    unlocked = true
  }
  @Synchronized fun verifyCurrentPin(pin: String) { assertUnlocked(); if (authMode() == "pin") verifyPin(pin) }

  /** The bridge must complete device authentication before calling this for an existing device lock. */
  @Synchronized fun configureAuth(mode: String, pin: String) {
    assertUnlocked()
    if (mode !in listOf("none", "pin", "device")) throw LocalSecurityException("AUTH_INVALID", "Choose a supported profile lock.")
    if (mode == "device" && !deviceAuthAvailable()) throw LocalSecurityException("AUTH_UNAVAILABLE", "Set up a screen lock in Android Settings first.")
    if (mode == "pin" && !pin.matches(Regex("^[0-9]{6,12}$"))) throw LocalSecurityException("PIN_INVALID", "Use a PIN with 6 to 12 digits.")
    val next = JSONObject(config().toString()).put("authMode", mode).put("pinFailures", 0).put("pinLockedUntil", 0L).put("pinDelayMs", 0L)
    next.remove("pinSalt"); next.remove("pinVerifier")
    if (mode == "pin") {
      val salt = SecureCrypto.randomBytes(16)
      val chars = pin.toCharArray()
      val verifier = try { SecureCrypto.derive(chars, salt, SecureCrypto.PIN_ITERATIONS) } finally { chars.fill('\u0000') }
      try { next.put("pinSalt", SecureCrypto.encode(salt)).put("pinVerifier", SecureCrypto.encode(verifier)) }
      finally { verifier.fill(0) }
    }
    saveConfig(next)
    unlocked = true
  }

  @Synchronized fun readData(): String? {
    assertUnlocked()
    val bytes = readEncrypted(dataFile, "fedd-data-v1") ?: return null
    return try { bytes.toString(Charsets.UTF_8) } finally { bytes.fill(0) }
  }
  @Synchronized fun writeData(data: String) {
    assertUnlocked()
    val bytes = data.toByteArray(Charsets.UTF_8)
    try { writeEncrypted(dataFile, "fedd-data-v1", bytes) } finally { bytes.fill(0) }
  }
  @Synchronized fun backupFolder(): JSONObject? = config().optJSONObject("backupFolder")?.let { JSONObject(it.toString()) }
  @Synchronized fun setBackupFolder(uri: String, name: String) {
    assertUnlocked()
    saveConfig(JSONObject(config().toString()).put("backupFolder", JSONObject().put("uri", uri).put("name", name)))
  }

  // Alarm delivery runs while the profile is locked. Encrypt its minimal payload
  // at rest with the same Keystore key, without exposing profile-data access.
  @Synchronized fun sealReminderPayload(payload: String): String {
    val bytes = payload.toByteArray(Charsets.UTF_8)
    if (bytes.size > 256 * 1024) throw LocalSecurityException("DATA_TOO_LARGE", "This reminder is too large.")
    try {
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.ENCRYPT_MODE, encryptionKey())
      cipher.updateAAD("fedd-reminder-v1".toByteArray(Charsets.UTF_8))
      return SecureCrypto.encode(MAGIC + cipher.iv + cipher.doFinal(bytes))
    } finally { bytes.fill(0) }
  }
  @Synchronized fun openReminderPayload(payload: String): String {
    try {
      if (payload.length > 512 * 1024) throw IllegalArgumentException("Too large")
      val envelope = SecureCrypto.decode(payload)
      if (envelope.size < MAGIC.size + 12 + 16 || !envelope.copyOfRange(0, MAGIC.size).contentEquals(MAGIC)) throw IllegalArgumentException("Invalid payload")
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, encryptionKey(), GCMParameterSpec(128, envelope.copyOfRange(MAGIC.size, MAGIC.size + 12)))
      cipher.updateAAD("fedd-reminder-v1".toByteArray(Charsets.UTF_8))
      val bytes = cipher.doFinal(envelope.copyOfRange(MAGIC.size + 12, envelope.size))
      return try { bytes.toString(Charsets.UTF_8) } finally { bytes.fill(0) }
    } catch (error: LocalSecurityException) { throw error }
    catch (_: Exception) { throw LocalSecurityException("SECURE_STORAGE_FAILED", "The saved reminder could not be opened securely.") }
  }
}
