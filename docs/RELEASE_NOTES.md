# Fedd v1.1 — Android testing release

Fedd helps you approach Instagram with an intention, a time window and a calm check-in. It does not filter Instagram's feed or block other apps.

## New in v1.1

- First-time users see the Entry Permit landing page based on the supplied Stitch design, then continue into the existing profile setup. Returning profiles continue to the existing unlock or Home flow.
- The Android launcher uses the supplied logo JPEG byte-for-byte, fitted proportionally. All other screens and flows remain unchanged.

The release also includes intentional sessions, Gentle/Firm/Silent nudges, check-ins, activities, offline profile and encrypted local backup/recovery.

## Install

Download **Fedd-v1.1.apk** from the release assets on Android 7.0 or newer. Open it using Files and allow installation from that source if prompted. Install over a previous signed Fedd APK to keep app data; back up before uninstalling. Allow notifications for nudges. The release includes its JavaScript bundle and needs no Expo, Metro or PC connection.

## Artifact and verification

- Filename: Fedd-v1.1.apk
- Size: 77,237,007 bytes (73.7 MiB)
- SHA-256: `B63072F33E8883ED52C04BE6C57A5017646A5F74938DE081E1A26BD02258C757`
- Package: com.fedd; launcher label: FedD
- Android versionName 1.1 / versionCode 2; min SDK 24 / target SDK 36
- Architectures: arm64-v8a, armeabi-v7a, x86, x86_64
- RSA-4096 APK v2 signer certificate SHA-256: `8116e6e9d707cb2fdc61bdf9e99eac37c962375b113ad684c98dd7427021bc55` (same as v1.0)
- Original logo JPEG SHA-256: `1F69871E193D32E61B638429D7102F998B58DB7575B14A093E79A7D0527D4F88`; its packaged bytes match the uploaded file.

Gradle reported BUILD SUCCESSFUL. Signature, alignment, version, embedded JavaScript/assets, original logo and native libraries were verified. Recorded checks: 143 JavaScript tests, 9 native crypto tests, TypeScript and ESLint. Emulator verification passed: v1.1 installed over v1.0 without clearing data; saved interests and the prior session count remained on Home. A clean installation showed Entry Permit, its action opened the existing profile setup, and a relaunch skipped Entry Permit.

## Testing limitations

Physical-phone sound/vibration, biometrics, Instagram-app routing, older Android versions and battery-saver behavior still need device testing. Android can delay notifications when exact-alarm permission is unavailable. Earlier emulator ANRs involved Android system processes; no Fedd ANR was found in captured records.

This is a personal-testing pre-release, not a Google Play publication.
