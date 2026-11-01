package com.fedd.platform

import android.util.Base64
import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/** Portable, password-encrypted backups; the password and key are never persisted. */
internal object SecureCrypto {
  const val PIN_ITERATIONS = 210_000
  const val BACKUP_ITERATIONS = 600_000
  const val MAX_DATA_BYTES = 8 * 1024 * 1024
  const val MAX_ENVELOPE_BYTES = 12 * 1024 * 1024
  private val random = SecureRandom()
  private val backupAad = "FedD backup v1|PBKDF2-HMAC-SHA256|600000|AES-256-GCM".toByteArray(Charsets.UTF_8)

  fun randomBytes(size: Int) = ByteArray(size).also(random::nextBytes)
  fun encode(bytes: ByteArray): String = Base64.encodeToString(bytes, Base64.NO_WRAP)
  fun decode(text: String): ByteArray = Base64.decode(text, Base64.NO_WRAP)

  fun derive(password: CharArray, salt: ByteArray, iterations: Int): ByteArray {
    val spec = PBEKeySpec(password, salt, iterations, 256)
    try {
      return try { SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded }
      catch (_: java.security.NoSuchAlgorithmException) { deriveForAndroid24(password, salt, iterations) }
    } finally { spec.clearPassword() }
  }

  // API 24/25 do not offer the named SHA-256 PBKDF2 factory. Use the identical
  // RFC 8018 algorithm with Android's HMAC-SHA256 implementation on those APIs.
  internal fun deriveForAndroid24(password: CharArray, salt: ByteArray, iterations: Int): ByteArray {
    val encoded = Charsets.UTF_8.encode(java.nio.CharBuffer.wrap(password))
    val passwordBytes = ByteArray(encoded.remaining()).also(encoded::get)
    try {
      val mac = Mac.getInstance("HmacSHA256")
      mac.init(SecretKeySpec(passwordBytes, "HmacSHA256"))
      var block = mac.doFinal(salt + byteArrayOf(0, 0, 0, 1))
      val result = block.clone()
      repeat(iterations - 1) {
        val next = mac.doFinal(block)
        block.fill(0)
        block = next
        for (index in result.indices) result[index] = (result[index].toInt() xor block[index].toInt()).toByte()
      }
      block.fill(0)
      return result
    } finally { passwordBytes.fill(0); if (encoded.hasArray()) encoded.array().fill(0) }
  }

  fun pinMatches(pin: CharArray, salt: ByteArray, expected: ByteArray): Boolean {
    val actual = derive(pin, salt, PIN_ITERATIONS)
    return try { MessageDigest.isEqual(expected, actual) } finally { actual.fill(0) }
  }

  internal fun encryptBackupPayload(bytes: ByteArray, keyBytes: ByteArray, nonce: ByteArray): ByteArray {
    require(keyBytes.size == 32 && nonce.size == 12)
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, nonce))
    cipher.updateAAD(backupAad)
    return cipher.doFinal(bytes)
  }

  internal fun decryptBackupPayload(bytes: ByteArray, keyBytes: ByteArray, nonce: ByteArray): ByteArray {
    require(keyBytes.size == 32 && nonce.size == 12)
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, nonce))
    cipher.updateAAD(backupAad)
    return cipher.doFinal(bytes)
  }

  fun encryptBackup(data: String, password: CharArray): ByteArray {
    validatePassword(password)
    val bytes = data.toByteArray(Charsets.UTF_8)
    if (bytes.size > MAX_DATA_BYTES) throw LocalSecurityException("DATA_TOO_LARGE", "Your data is too large for this backup format.")
    val salt = randomBytes(16)
    val nonce = randomBytes(12)
    val keyBytes = derive(password, salt, BACKUP_ITERATIONS)
    try {
      val encrypted = encryptBackupPayload(bytes, keyBytes, nonce)
      return JSONObject().put("format", "fedd-encrypted-backup").put("version", 1)
        .put("kdf", "PBKDF2-HMAC-SHA256").put("iterations", BACKUP_ITERATIONS)
        .put("cipher", "AES-256-GCM").put("salt", encode(salt)).put("nonce", encode(nonce))
        .put("ciphertext", encode(encrypted)).toString().toByteArray(Charsets.UTF_8)
    } finally { keyBytes.fill(0); bytes.fill(0) }
  }

  fun decryptBackup(envelope: ByteArray, password: CharArray): String {
    validatePassword(password)
    if (envelope.size > MAX_ENVELOPE_BYTES) throw LocalSecurityException("BACKUP_INVALID", "This backup file is too large.")
    try {
      val json = JSONObject(envelope.toString(Charsets.UTF_8))
      if (json.opt("format") != "fedd-encrypted-backup" || json.opt("version") != 1 ||
        json.opt("kdf") != "PBKDF2-HMAC-SHA256" || json.opt("iterations") != BACKUP_ITERATIONS ||
        json.opt("cipher") != "AES-256-GCM") throw IllegalArgumentException("Unsupported backup format")
      val salt = decode(json.opt("salt") as? String ?: throw IllegalArgumentException("Invalid salt"))
      val nonce = decode(json.opt("nonce") as? String ?: throw IllegalArgumentException("Invalid nonce"))
      val encrypted = decode(json.opt("ciphertext") as? String ?: throw IllegalArgumentException("Invalid ciphertext"))
      if (salt.size != 16 || nonce.size != 12 || encrypted.size < 16 || encrypted.size > MAX_DATA_BYTES + 16)
        throw IllegalArgumentException("Invalid backup lengths")
      val keyBytes = derive(password, salt, BACKUP_ITERATIONS)
      try {
        val plaintext = decryptBackupPayload(encrypted, keyBytes, nonce)
        return try { plaintext.toString(Charsets.UTF_8) } finally { plaintext.fill(0) }
      } finally { keyBytes.fill(0) }
    } catch (error: LocalSecurityException) { throw error }
    catch (_: Exception) { throw LocalSecurityException("BACKUP_INVALID", "The password is incorrect, or this backup is damaged or unsupported. Your current data has not changed.") }
  }

  fun validatePassword(password: CharArray) {
    if (password.size < 10 || password.size > 128) throw LocalSecurityException("PASSWORD_INVALID", "Use a backup password with 10 to 128 characters.")
  }
}

internal class LocalSecurityException(val code: String, message: String) : Exception(message)
