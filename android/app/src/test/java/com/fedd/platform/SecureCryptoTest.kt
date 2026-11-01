package com.fedd.platform

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/** Runs real JDK cryptography without mocking a cipher or Android Keystore. */
class SecureCryptoTest {
  private fun hex(value: String): ByteArray = value.chunked(2).map { it.toInt(16).toByte() }.toByteArray()

  @Test fun pbkdf2MatchesPublishedRfc7914Vectors() {
    // RFC 7914 section 11 specifies 64-byte keys. Their first 32 bytes are
    // also the expected 256-bit outputs because PBKDF2 output is prefix-stable.
    // https://www.rfc-editor.org/rfc/rfc7914.html#section-11
    val one = hex("55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc")
    val many = hex("4ddcd8f60b98be21830cee5ef22701f9641a4418d04c0414aeff08876b34ab56")
    assertArrayEquals(one, SecureCrypto.derive("passwd".toCharArray(), "salt".toByteArray(), 1))
    assertArrayEquals(many, SecureCrypto.derive("Password".toCharArray(), "NaCl".toByteArray(), 80_000))
    assertArrayEquals(one, SecureCrypto.deriveForAndroid24("passwd".toCharArray(), "salt".toByteArray(), 1))
    assertArrayEquals(many, SecureCrypto.deriveForAndroid24("Password".toCharArray(), "NaCl".toByteArray(), 80_000))
  }

  @Test fun android24FallbackMatchesUnicodePasswordDerivation() {
    val password = "pässwörd-中文-🔒".toCharArray()
    val salt = ByteArray(16) { it.toByte() }
    assertArrayEquals(SecureCrypto.derive(password, salt, 4096), SecureCrypto.deriveForAndroid24(password, salt, 4096))
  }

  @Test fun pinVerifierAcceptsOnlyTheCorrectPinAndSalt() {
    val salt = ByteArray(16) { it.toByte() }
    val verifier = SecureCrypto.derive("123456".toCharArray(), salt, SecureCrypto.PIN_ITERATIONS)
    assertTrue(SecureCrypto.pinMatches("123456".toCharArray(), salt, verifier))
    assertFalse(SecureCrypto.pinMatches("123457".toCharArray(), salt, verifier))
    assertFalse(SecureCrypto.pinMatches("123456".toCharArray(), salt.clone().also { it[0] = 99 }, verifier))
    assertFalse(verifier.contentEquals("123456".toByteArray()))
  }

  @Test fun backupPayloadRoundTripUsesPasswordDerivedKey() {
    val password = "a long backup password".toCharArray()
    val salt = ByteArray(16) { (it + 17).toByte() }
    val nonce = ByteArray(12) { it.toByte() }
    val key = SecureCrypto.derive(password, salt, SecureCrypto.BACKUP_ITERATIONS)
    val plaintext = "{\"name\":\"TestUser\",\"idea\":\"Breathe 🌿\"}".toByteArray(Charsets.UTF_8)
    val encrypted = SecureCrypto.encryptBackupPayload(plaintext, key, nonce)
    assertEquals(plaintext.size + 16, encrypted.size)
    assertFalse(encrypted.contentEquals(plaintext))
    assertArrayEquals(plaintext, SecureCrypto.decryptBackupPayload(encrypted, key, nonce))
    val wrongKey = SecureCrypto.derive("another backup password".toCharArray(), salt, SecureCrypto.BACKUP_ITERATIONS)
    assertThrows(AEADBadTagException::class.java) { SecureCrypto.decryptBackupPayload(encrypted, wrongKey, nonce) }
  }

  @Test fun authenticationRejectsCiphertextTagAndNonceTampering() {
    val key = ByteArray(32) { it.toByte() }
    val nonce = ByteArray(12) { (it + 31).toByte() }
    val encrypted = SecureCrypto.encryptBackupPayload("private session".toByteArray(), key, nonce)
    for (index in listOf(0, encrypted.lastIndex)) {
      val changed = encrypted.clone().also { it[index] = (it[index].toInt() xor 1).toByte() }
      assertThrows(AEADBadTagException::class.java) { SecureCrypto.decryptBackupPayload(changed, key, nonce) }
    }
    val changedNonce = nonce.clone().also { it[0] = (it[0].toInt() xor 1).toByte() }
    assertThrows(AEADBadTagException::class.java) { SecureCrypto.decryptBackupPayload(encrypted, key, changedNonce) }
  }

  @Test fun backupCannotBeDecryptedUnderAnotherDataDomain() {
    val key = ByteArray(32) { (it + 11).toByte() }
    val nonce = ByteArray(12) { it.toByte() }
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, nonce))
    cipher.updateAAD("fedd-data-v1".toByteArray())
    val wrongDomain = cipher.doFinal("private data".toByteArray())
    assertThrows(AEADBadTagException::class.java) { SecureCrypto.decryptBackupPayload(wrongDomain, key, nonce) }
  }

  @Test fun secureRandomNoncesProduceDifferentCiphertextForIdenticalData() {
    val key = ByteArray(32) { it.toByte() }
    val nonceA = SecureCrypto.randomBytes(12)
    val nonceB = SecureCrypto.randomBytes(12)
    assertFalse(nonceA.contentEquals(nonceB))
    val plaintext = "identical data".toByteArray()
    val a = SecureCrypto.encryptBackupPayload(plaintext, key, nonceA)
    val b = SecureCrypto.encryptBackupPayload(plaintext, key, nonceB)
    assertFalse(a.contentEquals(b))
    assertArrayEquals(plaintext, SecureCrypto.decryptBackupPayload(a, key, nonceA))
    assertArrayEquals(plaintext, SecureCrypto.decryptBackupPayload(b, key, nonceB))
  }

  @Test fun rejectsPasswordAndDataSizeBoundsBeforeProducingBackup() {
    for (password in listOf("short", "a".repeat(129))) {
      val error = assertThrows(LocalSecurityException::class.java) { SecureCrypto.validatePassword(password.toCharArray()) }
      assertEquals("PASSWORD_INVALID", error.code)
    }
    SecureCrypto.validatePassword("a".repeat(10).toCharArray())
    SecureCrypto.validatePassword("a".repeat(128).toCharArray())
    // UTF-8 bytes, rather than UTF-16 character count, determine the bound.
    val oversized = "é".repeat(SecureCrypto.MAX_DATA_BYTES / 2 + 1)
    val error = assertThrows(LocalSecurityException::class.java) { SecureCrypto.encryptBackup(oversized, "a long password".toCharArray()) }
    assertEquals("DATA_TOO_LARGE", error.code)
  }

  @Test fun rejectsInvalidAesKeyAndNonceLengths() {
    assertThrows(IllegalArgumentException::class.java) { SecureCrypto.encryptBackupPayload(byteArrayOf(1), ByteArray(16), ByteArray(12)) }
    assertThrows(IllegalArgumentException::class.java) { SecureCrypto.decryptBackupPayload(byteArrayOf(1), ByteArray(32), ByteArray(11)) }
  }
}
