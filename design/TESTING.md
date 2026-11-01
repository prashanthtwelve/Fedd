# FedD Android manual test checklist

## Sanitized publication checkout — 14 October 2026



## Final release delivery and remaining tests — 14 October 2026

- Final file: `.\Fedd.apk`, **77,160,045 bytes (73.6 MiB)**. SHA-256: `13A9A3D2B4FBBECE6A7FCB46CE7747C8278321CDA9F52A0022B18894272C2A49`. Byte-identical to the release whose Gradle build reported **BUILD SUCCESSFUL in 51s**. No application source changes were made during this final test pass.
- The final root copy passed apksigner v2 RSA-4096 signature verification and 16 KB ZIP alignment, manifest/package/ABI checks, and `adb install -r` returned **Success** on Android 16/API 36. Package `com.fedd`, label `FedD`, minimum Android 7/API 24. Bundled Hermes JavaScript, fonts and four ABI runtimes were verified during packaging; no Metro is needed.
- **Notification-tap PASS:** a real one-minute Firm session delivered its primary notification while the profile was PIN-locked in the background, with goal `Final tap test`. Tapping the notification opened the PIN gate; correct PIN opened the matching Check-in. AlarmManager showed no remaining scheduled Fedd alarm after Check-in opened (historical alarm statistics remain). Completing Check-in returned Home. An earlier unattended Firm session delivered both the primary and two-minute follow-up while locked. Expired-session recovery also passed after emulator reboot/unlock.
- **Reinstall recovery PASS:** confirmed the previously verified 1,965-byte backup still existed in Documents/FedDBackupsTest, uninstalled only the disposable emulator app, installed the signed APK (Success), and cold-launched (Status: ok). From fresh Login, Restore opened Android's file picker without an old folder grant. The password decrypted the backup and confirmation displayed 3 interests, 1 session, 1 idea and 0 activities. Confirmed restore returned Home. After force-stop/cold-launch, the profile name `apk test`, three selected interests, five-minute default, Firm preference and Insights' one completed goal/session remained. No prior PIN or folder grant was imported. This intentionally restores the older backup snapshot; the two newer synthetic timer sessions were not in that snapshot. Notification permission must be granted again after reinstall. The backup had no completed activities, so nonempty activity-history recovery remains a phone/manual case.
- **ANR investigation:** preserved Android DropBox, 19 ANR traces and process-exit history before uninstall. Recorded failures named SystemUI/keyguard, system_server (`No response to onStartJob`) and PermissionController, with severe guest memory/I/O pressure. A later system_server stall was in Android permission persistence/fsync. No Fedd ANR/crash record or Fedd frames appeared in those traces; after the successful rerun the app exit history contained only the intentional force-stop. The evidence points to Android system/emulator resource stalls, not a recorded Fedd ANR. The exact host/emulator cause is not isolated; more RAM alone is not a proven fix. Detailed evidence: `artifacts/ANR-DIAGNOSTICS.md`. No app change was justified.
- **Still requires a physical phone:** actual Instagram-app handoff (emulator lacks Instagram), audible/vibration/heads-up behavior (headless emulator has no audio), full five-minute runs for all styles with battery saver, fingerprint/device credentials including older APIs, PIN throttle/reboot edge cases, revoked/moved folder permissions, nonempty activities backup, and TalkBack. These limits do not block delivery of the verified installable APK.
- Source verification remains TypeScript, ESLint, 139 JavaScript tests and 9 Android JVM crypto tests passing. No source changes since those checks.

Install: transfer Fedd.apk by USB File Transfer to the phone's Downloads folder, tap it in Files, allow that Files app to install unknown apps when Android asks, and choose Install. Android 7 or newer is required. Keep existing app data by installing as an update; do not uninstall a real phone copy merely to update. After opening, allow notifications when requested. USB debugging alternative: `adb devices`, then `adb install -r ".\Fedd.apk"`.

For future releases, run `powershell -ExecutionPolicy Bypass -File .\scripts\build-apk.ps1` from . using the existing private signing key, then copy the verified artifacts\Fedd.apk to Fedd.apk. Retain the signing key outside Git for compatible updates.

## Current verification status

14 October 2026: TypeScript, ESLint and **139 JavaScript tests** pass. Latest native Kotlin compilation and **9 Android JVM crypto tests** passed with BUILD SUCCESSFUL in 2m 40s. The original OneDrive/C: build failed with AccessDeniedException and zero free space; the user approved copying the same source/history to **.**, preserving the original. The final signed release there passed **BUILD SUCCESSFUL in 51s** (258 tasks). Fedd.apk is **77,160,045 bytes (73.6 MiB)**; SHA-256 **13A9A3D2B4FBBECE6A7FCB46CE7747C8278321CDA9F52A0022B18894272C2A49**. Signature (same RSA 4096/v2 certificate), ZIP alignment, package com.fedd/label FedD/API24 minimum/API36 target, compiled Hermes bundle, fonts and four ABI runtimes verified. Emulator results below distinguish completed smoke cases from remaining phone tests.


### New-feature emulator evidence — 14 October 2026

- API 36/Android 16 FeddTest Pixel 5 AVD, WHPX, no Metro, no audio, Instagram absent. Android system ANRs interrupted earlier testing; final notification-tap and reinstall tests completed. See the final investigation above for evidence and limits.
- Signed update installed over the previous build. Legacy `apk-test` email prefix became `apk test`; three interests, selected interests, one completed session/goal, one idea, five-minute default and Firm setting survived. All four tabs return after PIN unlock; a real hidden-tab regression was fixed and covered by tests, including expired-session recovery.
- PIN setup, ordinary Home/background and update/process restart gate access. An incorrect PIN is rejected; correct synthetic PIN restores data. Emulator-private vault/security files have the encrypted `FEDD` v1 header and no readable test name/PIN/backup password. This is ciphertext evidence, not a claim of forensic erasure of old SQLite pages.
- Android local folder picker created/granted Documents/FedDBackupsTest. It returned to Privacy without losing operation state and the folder stayed selected across restart/update. Back Up created a 1,965-byte encrypted file; a separate Node crypto implementation decrypted it and verified all expected profile/interests/history/idea/settings fields, with no credentials/authentication fields.
- Wrong-password restore showed an error. Cancelling valid restore left the data-vault SHA-256 unchanged. Confirmed restore replaced a changed test name with the backed-up name and retained the installation PIN. The confirmation is an immediately visible existing-style sheet.
- Firm five-second test notification ID312 delivered in the background while Fedd remained PIN-locked, using high importance and the expected channel sound/vibration configuration. Physical sensation is unverified on this headless emulator.
- Timed notification-tap and reinstall recovery passed in the final run detailed above. Physical-phone limitations remain listed there.

## Offline profile, authentication and migration — pending Android device tests

Use a separate test profile and persistent backup folder. Before uninstalling or deliberately changing test data, create and verify a backup; uninstalling deletes internal data and Keystore keys. Record model/API, build hash, chosen auth method, and results. Include Android 7/8/9 for the screen-lock fallback and Android 10+ for biometrics/device credentials.

- [ ] Fresh offline install: Login/Create profile accepts a trimmed name of 1–60 characters, rejects blank/control-character/overlong names, and has no email/password or Google/Firebase/backend login requirement. Airplane mode does not prevent creating or reopening the profile.
- [ ] Create a profile with no optional lock. Complete the preset picker and default session length, kill/reopen the app, and confirm the name, onboarding, interests and settings are remembered.
- [ ] PIN setup rejects fewer than 6 or more than 12 digits, nondigits and a mismatched confirmation. A valid PIN unlocks the remembered profile after process restart and ordinary background/resume.
- [ ] Wrong PIN attempts do not expose personal data. After five failures the delay appears; repeated failures increase the delay. Restart/process death and changing the wall clock do not bypass an active delay. Verify recovery after the delay and with the correct PIN.
- [ ] Enable device authentication with a configured Android screen lock. Android 10+ permits available strong biometrics or the device credential; Android 7–9 use device PIN/pattern/password confirmation. With no secure screen lock, setup/unlock reports friendly guidance without removing data or accepting an unlock.
- [ ] Cancel biometric/credential authentication or press Home while it is open. No stale success/error callback can unlock later or dismiss a newly started prompt. Reopening an abandoned SAF/legacy-credential flow requires a fresh unlock where a profile lock is configured.
- [ ] Change PIN, switch PIN/device authentication, or remove a lock from Privacy & Data. The current PIN or a fresh current device-authentication prompt is required first. Invalid/cancelled changes preserve the existing lock and saved profile.
- [ ] Ordinary Home/background, process restart and device lock gate access. Opening Fedd's own Android folder/file/authentication prompt completes or cancels without losing profile data. Test Home during the file picker, then return through app icon and a notification deep link.
- [ ] Update an installation containing the old demo profile. Its email prefix becomes the display name, email metadata stays in the profile, and preset/custom interests, active/completed sessions, goals, saved ideas, nudge/default timer and onboarding are retained. No new onboarding is forced for an already onboarded profile.
- [ ] Inspect app-private test storage in a debuggable build: the authoritative vault/security metadata and reminder goal payloads are ciphertext, not readable profile JSON/PIN/password. No PIN or backup password appears in logs. Successful migration removes the old AsyncStorage value only after a verified vault round trip; simulate an interrupted/failed migration without deleting its source.
- [ ] Complete breathing, five things, intention and free-write activities. Restart and verify persisted completion/reflection records and backup preview counts. Insights still derive from stored session records and contain no seeded wins/streaks.
- [ ] With PIN/device lock enabled, start an Instagram session and leave Fedd. The reminder still fires in the background. A real notification tap first requires unlocking, then opens the correct Check-in without acknowledging it early; extension and completion retain their previous behavior. Five-second test nudges still dismiss without opening a real Check-in.

## Privacy & Data and encrypted backups — pending Android device tests

- [ ] Settings → Privacy & Data follows the existing Stitch colors/type/card styling and has Choose Folder/Change Folder, Back Up and Restore. No broad device-storage permission or cloud account is requested.
- [ ] Choose a local folder such as `Documents/FedD Backups` with Android's folder picker, outside the app-private storage. Confirm its display name and permission persist after restart. When Android disallows selecting a folder root, a permitted subfolder works.
- [ ] Cancel choosing/changing a folder: the previous folder and all profile data remain. Revoke its document grant, move/delete the folder, or remove an SD card: backup reports friendly guidance and Change Folder repairs access without clearing current data.
- [ ] Back Up requires a password of 10–128 characters and matching confirmation, rejects blank/invalid lengths, and does not remember the password after completion/cancellation. Do not reuse a short PIN as the backup password.
- [ ] A successful backup creates a new `.feddbackup` file. Repeat a backup and confirm the first file is not overwritten. The contents have versioned PBKDF2-HMAC-SHA256/AES-256-GCM metadata and ciphertext; there are no readable names, interests, goals, reflections, PINs or passwords.
- [ ] Simulate no free space/unavailable folder and cancelled UI. The operation reports failure rather than success, and current personal data remains. A partial backup, if left by Android's provider, fails authenticated restore.
- [ ] Restore opens the local document picker even without a saved backup folder. With existing PIN/device authentication, unlock first. Select a valid file/password; verify the preview before explicitly confirming replacement.
- [ ] Cancel the file picker or replacement confirmation: no profile records/settings are replaced. A wrong password, modified ciphertext/tag/nonce, unsupported version/KDF/iterations, malformed/oversized file or invalid decrypted application data also leaves current data unchanged.
- [ ] Confirm replacement: the backed-up profile/name/email metadata, interests, selections, session goals/history, ideas, activity history and settings replace current profile data together. The current installation's PIN/device-lock configuration remains unchanged; no credentials or folder grants are imported from a backup.
- [ ] Restore an active-session backup with a past/future deadline. Remaining time comes from endTimestamp; stale alarms are cancelled and applicable current reminders/check-in are recovered without duplicate notifications or extra session history.
- [ ] Verify each restored field after force-stop/restart, including custom interests and activity reflections. Modify a setting, back up again, and confirm the newly created file contains the updated data.
- [ ] Reinstall recovery with a test profile: retain a verified backup outside app-private storage and remember its password, uninstall/install the same app, choose Restore from Login, select the file and restore. It works without the old folder URI grant or Keystore key. Set up a new optional PIN/device lock afterward.
- [ ] Forgotten backup password cannot be reset or recovered by Fedd. Losing both internal data and a valid backup/password cannot be repaired offline; existing data is never silently reset after a Keystore failure.
- [ ] Existing JSON/Markdown reflection sharing remains an explicitly unencrypted export with a clear warning; it does not substitute for the encrypted full-data backup.
- [ ] TalkBack labels controls and selected auth choices; actions remain reachable with large text, keyboard and narrow screens. Compare only the necessary new auth/privacy screens against the existing design system; existing screens retain their layout.

### Previous release evidence — 12 October 2026

- File: `artifacts/Fedd.apk`, **77,073,461 bytes / 73.5 MiB**; SHA-256 `AAFCEA16A1AF458E8D1220FEC94257C4C2FAF646A0C87C2D77642A00BD1E5BB6`.
- Command: `scripts/build-apk.ps1` invokes `gradlew.bat assembleRelease --no-daemon --console=plain --max-workers=2`; final Gradle result **BUILD SUCCESSFUL in 1m 37s**, 258 tasks, 21 executed/237 up-to-date. Log: `<tool-root>\release-build-verified.log`.
- APK signature verification passed (v2, RSA 4096, CN=FedD Personal Testing). Certificate SHA-256 `8116e6e9d707cb2fdc61bdf9e99eac37c962375b113ad684c98dd7427021bc55`. `zipalign -c -P 16 4` passed. All 30 arm64-v8a/x86_64 native ELF libraries have LOAD alignment at least 16 KB.
- Manifest verified: `com.fedd`, label `FedD`, non-debuggable, min API 24/Android 7, target API 36. ABI runtime/modules verified for arm64-v8a, armeabi-v7a, x86 and x86_64. Nonempty Sora/DM Sans font assets and 3 MB compiled Hermes bytecode bundle present.
- Test environment: FeddTest Pixel 5 AVD, Google APIs Android **16/API 36**, x86_64, WHPX hardware acceleration, no audio output, POST_NOTIFICATIONS initially denied then granted through its real prompt, exact alarms allowed for the timed smoke test. Instagram is not installed. No Metro server or adb reverse mapping was used.
- `adb install -r` and cold `am start -W -n com.fedd/.MainActivity` passed. A subsequent signed update preserved the demo profile/onboarding/three interests/default timer. Initial Home hook crash was found and fixed by rendering the floating tab bar as a React element; the final APK opens Home/Settings without that error.
- Login, picker (Continue disabled after two; enabled after three; no custom entry), five-minute default persistence, three-interest Home selection, Intent custom one-minute goal and three-interest Handoff passed. Browser fallback opened Chrome's first-run activity when Instagram was absent; authenticated Instagram navigation was not tested.
- Gentle/Firm/Silent five-second background tests produced notification ID 312 on the correct channel with importance 3/4/2 and required titles. Channel dumps verify default sound for Gentle/Firm, `[0,250,150,250]` vibration for Firm, and no sound/vibration for Silent. Actual audio/vibration sensation is unverified because this is a headless emulator. Tapping a test notification dismissed it and left the launcher foregrounded, without Check-in.
- A real one-minute Firm session scheduled primary and follow-up at endTimestamp and endTimestamp + 120000, while FedD was behind Chrome/Home. Primary notification ID 310 arrived with `Goal: Find lighting ideas`; tapping it opened the correct Check-in. Pending Firm alarms dropped to zero on acknowledgement. Need 5 more minutes created a new exact primary/follow-up pair five/seven minutes ahead and returned through the browser fallback; reopening showed five minutes remaining. Early Check-in/Found completion saved `Use window light`, cleared all pending session alarms and returned Home. Insights showed one started/one completed session, confirming extension and test nudges did not create extra sessions. Actual unacknowledged Firm follow-up delivery and five-minute phone/battery-saver cases still need the checklist.
- All four tab destinations opened without runtime errors. Firm preference remained selected after a force-stop/cold restart. Activities hub and running breathing screen were exercised; complete activity durations and the other activity interactions remain manual cases. UI Automator cannot get idle while the activity timer is updating, so running-screen evidence uses screenshots instead of stale UI dumps.

Screenshots and local system dumps are in the ignored `artifacts` folder; APK checks are in `artifacts/verification.json`. `npm run check` passes TypeScript, ESLint and 6 suites/42 tests, including Instagram fallbacks, timestamp recovery, nudge duplication/cancellation/extensions and persistence.

For each run record the APK SHA-256, build command/result, phone/emulator model, Android version/API, notification/exact-alarm permissions, Instagram installed/version, and result for each test. Test at least Android 13+ and an Android 12+ device with exact-alarm permission denied. Use a fresh app install for onboarding, then retain its local data for later-launch checks.

## Previous APK installation evidence and remaining phone checks

- [x] Gradle ends with `BUILD SUCCESSFUL`; signed `android/app/build/outputs/apk/release/app-release.apk` and copied `artifacts/Fedd.apk` exist. Size/hash recorded above. A debug APK was not generated in this release pass.
- [x] Install and launch on the API 36 emulator with `adb install -r`; update preserves local data. Repeat on a physical phone below.
- [x] Release APK cold-starts and navigates without Metro or adb reverse. For standalone **debug**, use `-Pstandalone=true`; regular `assembleDebug` uses Metro during development.
- [ ] Copy Fedd.apk to a physical phone, allow Install unknown apps for Files/browser and install. Disconnect USB and verify startup/navigation, then grant notifications and optional Alarms & reminders access.
- [ ] No Expo Go, companion app, browser-hosted interface, or Instagram credentials are required.

## First launch and persistence

- [ ] Login/Create profile uses a local name and optional PIN/device authentication. Run the new offline-profile checks above; the previous mock email/password flow is historical.
- [ ] First sign-in opens the full-screen preset picker. It has **no Add your own chip, button, or input**.
- [ ] Counter reads `N of 5 selected`. Continue is disabled at 0, 1 and 2; enabled at 3, 4 and 5. A sixth pick is refused; deselection remains possible.
- [ ] Session length offers 5, 10 and 15 minutes. Select each in separate runs; saved choice becomes the default and Continue opens Home.
- [ ] Kill/relaunch the signed-in app: onboarding is not repeated and saved interests/default length remain.

## Home and custom interests

- [ ] Select/deselect saved tiles. Every selection has a clear fill/outline and checkmark.
- [ ] Zero selected disables Continue. One/two/three selections produce `Continue with <first>`, `<first> +1`, `<first> +2`.
- [ ] A fourth tile displays `Pick up to 3 for a focused session.` and does not alter the three selections.
- [ ] Dashed `+ Add your own interest` opens a dismissible bottom sheet with one field and Add.
- [ ] Blank/whitespace-only names are rejected; input caps at 24 characters; duplicate names are rejected ignoring case and surrounding spaces.
- [ ] A valid custom interest is saved and automatically selected. At three existing selections it replaces the most recent selection and explains that choice; total remains three.
- [ ] Creating an eleventh custom interest is refused. Preset and custom interests survive process restart.

## Intent Setup and Handoff

- [ ] Intent opens as a rounded bottom sheet over Home. Floating nav is hidden. Dismiss/back returns to Home without creating a session.
- [ ] All selected interests appear as chips. 5/10/15/Custom work; invalid/empty custom durations disable launch. Test 1 and 180 minute boundaries.
- [ ] Optional one-line goal persists in the session. Enabling the breathing activity runs it before Handoff.
- [ ] Handoff pauses for three seconds and displays the correct names for one, two and three interests: `Filmmaking`; `Filmmaking and Editing`; `Filmmaking, Editing and Music`.
- [ ] Duration and goal are correct. Copy says `Opening Instagram for …` and never claims the feed is filtered.
- [ ] Background/back during Handoff does not unexpectedly launch Instagram later or create duplicate sessions.

## Instagram launch and fallback

- [ ] With Instagram installed, a valid first-interest tag is attempted in the Instagram app.
- [ ] A syntactically invalid tag (for example `Art & Design`) skips the tag and opens Instagram home.
- [ ] If Instagram accepts a tag but displays unavailable content internally, return to Fedd and use `Open Instagram home`. Fedd cannot detect Instagram's internal error pages.
- [ ] With Instagram uninstalled, launch falls back to `https://www.instagram.com/` in a browser. Confirm the session remains saved.
- [ ] Disable `INTEREST_LANDING_ENABLED` in `src/lib/instagram.ts`, rebuild, and confirm launch opens app home without a tag attempt.
- [ ] Repeated launch retries never add a second session. Fedd never scrapes, asks for credentials, or controls Instagram's content.

## Reminders and Check-in

- [ ] On Android 13+, the first session requests POST_NOTIFICATIONS. Allow it; test another fresh install with Deny.
- [ ] Denial is explained and does not lose the session. Reopening Fedd after its deadline still reaches Check-in.
- [ ] With exact alarms allowed, a scheduled notification fires at the saved deadline while Fedd is backgrounded and Instagram is foregrounded. Record actual delivery delay.
- [ ] With exact alarms denied, the inexact fallback is explained and does not crash. Android may delay delivery; deadline recovery still works.
- [ ] Gentle, Firm and Silent channels behave appropriately. Silent has no sound/vibration. Test channel settings as well as the app preference.
- [ ] Tap the notification with Fedd backgrounded, then repeat after its process has been killed: both open the correct current session's Check-in.
- [ ] Reopening before expiry shows remaining time; reopening after expiry shows Check-in. Device time/background duration is recomputed from endTimestamp.
- [ ] `Found what I needed` completes one session. `Got distracted` completes one session without guilt copy. Both return Home.
- [ ] Optional idea is saved once, with interests/date, and appears in Saved Ideas. Blank ideas are not saved.
- [ ] `Need 5 more minutes` keeps the same session, saves any idea once, sets a new five-minute deadline, schedules a new reminder and reopens Instagram. Sessions-started does not increase.
- [ ] Double-tapping Done/extension does not duplicate sessions, outcomes or ideas. Old notifications do not open a completed/different session.
- [ ] Reboot with an active session: pending reminder is restored; opening Fedd recovers from its stored timestamp.

## Activities, Insights and Settings

- [ ] Box breathing runs 60 seconds with four-second inhale/hold/exhale/rest phases and a clear finish.
- [ ] Name 5 things runs 45 seconds and all five markers toggle independently.
- [ ] Why am I here runs 30 seconds and accepts a reflection. Completion/back works.
- [ ] Free-write accepts text for its finite session. Frame a shot and Memory match clearly say coming soon.
- [ ] Background/resume during activities recomputes the countdown without a runaway background timer.
- [ ] Fresh Insights shows zero, not seeded wins. After found/distracted outcomes, counts and satisfaction bar agree with stored records for the last seven days.
- [ ] Extensions do not count as completed outcomes or extra session starts. No streaks or guilt language appear.
- [ ] Settings preset picker still enforces 3–5 and preserves existing custom interests.
- [ ] `Your own` lists custom interests and permits confirmed deletion. Settings cannot create custom interests. Deleting one also clears its current selection while retaining historical sessions/ideas.
- [ ] Default timer and nudge style persist after restart. Permission buttons open Android settings.
- [ ] Shortcut setup explains opening Fedd first, without claiming it intercepts Instagram launches.

## Layout and accessibility

- [ ] Compare each rendered screen to `design/stitch/<screen>/screen.png`, accounting for the documented behavior differences in NOTES.md.
- [ ] Exactly four floating tabs: Home, Activities, Insights, Settings. Active tab has icon/label; inactive tabs have outline icons only. No extra control. Hidden on auth/onboarding/intent/handoff/check-in.
- [ ] Test narrow screen, large font scale, keyboard, gesture navigation and three-button navigation. Content/actions remain reachable.
- [ ] TalkBack labels icon buttons and selected interests; all touch areas are at least 44dp; text contrast is readable.
- [ ] Record remaining visual differences instead of marking screenshot fidelity passed without device evidence.

## Nudge styles — real Android phone (12 October 2026)

All physical-phone items below are **Not run**. The JDK/SDK/adb and storage blockers were resolved for the earlier release; source and emulator tests do not verify real-phone delivery or sound. Repeat these cases on an updated APK with the optional profile lock enabled.

- [ ] Fresh install: Gentle is selected. Select Firm or Silent, force-close/reopen Fedd, and confirm the preference is restored. Existing v1 uppercase preferences migrate without losing history/custom interests.
- [ ] Inspect Android's notification categories after a test/session: `fedd_nudge_gentle`, `fedd_nudge_firm`, `fedd_nudge_silent` are separate channels with default/high/low importance respectively. User changes to channel sound/importance are respected. See [Android channel behavior](https://developer.android.com/develop/ui/compose/notifications/channels).
- [ ] **Gentle:** choose a five-minute session, enter Instagram, press Home and leave Fedd backgrounded. At endTimestamp, expect one default-importance notification, default notification sound, no repeat, and “Time's up. Did you find what you wanted?” Repeat with a goal and without a goal; only a nonempty goal produces `Goal: <goal>` on the second line.
- [ ] **Firm:** choose a five-minute session and leave Fedd backgrounded. Expect one high-importance notification with sound, heads-up (if system settings allow), and vibration `[0,250,150,250]`, saying “Your 5 minutes are up. Time to check in.” Leave Check-in unopened; expect exactly one follow-up scheduled two minutes after the saved deadline, saying “Still in Instagram? Come back and check in.” Record actual delivery delay.
- [ ] **Silent:** choose a five-minute session, press Home and leave Fedd backgrounded. At endTimestamp, expect one low-importance shade notification saying “Session finished. Check in whenever you're ready.” Verify no sound, vibration or heads-up.
- [ ] For each style, tap the real session notification with Fedd backgrounded; repeat after process death. The current session's Check-in form opens. No other app is blocked or forcibly foregrounded.
- [ ] Firm cancellation: open Check-in after the primary notification but before its follow-up. Wait beyond endTimestamp + two minutes; no follow-up arrives. Also test early Check-in, manual opening of Fedd, process death/relaunch and reboot after acknowledging Check-in.
- [ ] Mounting Check-in's “session is in progress” route behind Instagram must not acknowledge the session. Without returning to Fedd, Firm still sends its primary/follow-up.
- [ ] Choose Need 5 more minutes and Done. Old follow-up is removed, a new deadline is saved, and the same style schedules a new primary and (for Firm) one new follow-up. Change the default while a session is active: its style stays unchanged, but the next session uses the new channel.
- [ ] Finish as Found or Distracted. Wait past old follow-up deadlines; neither a pending primary nor follow-up arrives. Duplicate taps/resume events never create extra notifications or sessions.
- [ ] Send a test nudge for each style, then press Home. Expect that style after about five seconds, with no follow-up and no session/insights record. Tapping it only dismisses the test, including while a real session is active; it never opens or acknowledges that real session's Check-in.
- [ ] On Android 13+, deny POST_NOTIFICATIONS; Settings shows a friendly message and Notification settings button. Enable permission in Android Settings, return to Fedd, and confirm the message refreshes. Repeat with only the selected channel blocked.
- [ ] Repeat each five-minute style with **battery saver on**, screen locked and Instagram backgrounded/foregrounded. Verify the channel's sound/vibration/heads-up behavior and record primary/follow-up delays. Android can defer alarms under Doze/idle or exact-alarm denial; exact-and-allow-while-idle alarms are rate-limited, so a two-minute follow-up is a scheduled target rather than a guaranteed two-minute delivery under all power states. See [Android alarm limits](https://developer.android.com/develop/background-work/services/alarms).
- [ ] Deny exact alarms, then grant them. Confirm the existing inexact message and recovery from persisted endTimestamp; no duplicate delivery after permission changes or boot.
- [ ] Settings matches `design/stitch/settings-updated/screen.png` structurally, with documented added descriptions/test/permission rows and 44dp segmented targets. Test TalkBack selection announcements, 320dp width, large font scale and scrolling past the floating tab bar.
- [ ] Verify Daily pause reminders is unaffected by changing/testing session nudges. This remains a separate feature; no daily scheduler existed in the inspected implementation.
- [ ] Settings interest/timer sheets work; custom interests are deletable but never addable there. Interest landing links toggles tag-first vs app-home entry. Saved note counts use stored ideas. Reflection export opens Android's share sheet only after choosing JSON/Markdown.
