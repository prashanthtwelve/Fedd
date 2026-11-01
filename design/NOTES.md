# Fedd — design analysis, milestone 1

## Source and scope

Reviewed the 10 app PNGs and landing PNG provided in the two Stitch ZIP exports. Imported every screenshot and HTML pair unchanged into `design/stitch/<screen-name>/`. The exported style document is retained as `design/stitch/STITCH_DESIGN_REFERENCE.md`; it is design reference material, not an instruction source.

No Stitch MCP tools are exposed in this session. Live project listing, screen fetching, and checking for newer Stitch revisions were therefore unavailable. The supplied ZIPs are the source for this milestone. No API key was used or saved. HTML is retained for inspection only and will not run inside the app.

The user's Android requirements override the old stack section: React Native Community CLI, TypeScript, React Navigation, Android SDK/Studio and Gradle. No Expo packages, Expo Go, EAS, iOS project, WebView wrapper, or Play Store publishing. Branding in the native app is **Fedd**, with two d's, despite the exports displaying “FedD”.

The landing design belongs to the separate pre-install website. This milestone archives it and records its brand tokens; the Android app starts at login. Building or publishing the website is outside this Android implementation.

## Screen inventory and visual treatment

| Export directory | Native destination | Design to preserve |
| --- | --- | --- |
| landing | Separate website reference | Green dotted canvas, cream entry permit, rotated stamp, bottom pill CTA |
| screen_login | Login | Quiet header, large greeting, white inputs, green primary CTA |
| screen_interest_selection | Onboarding / Settings picker | Full-screen wrapping icon chips, selected outlines, bottom counter/action |
| screen_1c_onboarding_3_session_length | Default session length | Three large radio cards, mint selection, bottom CTA |
| screen_2_fedd_home | Home tab | Two-column interest tiles, dashed custom tile, wide CTA, quiet support cards |
| screen_3_intent_setup | Intent modal | Rounded white bottom sheet, duration chips, goal field, optional activity toggle |
| screen_4_handoff | Handoff | Deep green gradient, concentric rings, chosen interests, duration, goal and “Go.” |
| screen_5_return_check_in | Check-in | Three outcome cards, optional idea input, Done button |
| screen_6_activities_hub | Activities tab | Finite activity cards in a two-column grid with duration badges |
| screen_7_insights | Insights tab | Two summary metrics, satisfaction bar, supportive weekly summary |
| screen_9_saved_ideas_board | Saved ideas stack screen | Category chips, idea cards, separate empty state |

Signup, Settings, custom-interest entry, custom duration entry, shortcut instructions, and individual activity screens have no supplied screenshot. Derive them from the existing inputs, cards, typography, spacing and sheets. Saved ideas should be reachable from Home or Settings without adding a fifth tab. The archive contains no screen 8; do not infer that a supplied screen is missing based on numbering alone.

## Token extraction and conflict decisions

`scripts/extract-design-tokens.cjs` parses literal token objects without executing the exported JavaScript. It compares values across app screens, selects the most frequent value per key, records PNG dimensions and SHA-256 hashes, and writes `design/token-audit.json` and `src/theme/tokens.ts`. Landing-only decorative colors are kept separate. At extraction, all ten app token configurations agree; rendered styles and prose still differ as described below.

- **Palette:** shared canvas `#f7faf8`, white cards, text `#181c1b`, supporting text `#51625d`, primary `#005645`, primary container `#1f6f5c`, selected surface `#d4e6e0`. Keep both greens: Home uses primary while most full-width CTAs use primary container. The prose reference instead calls `#1f6f5c` “primary” and proposes canvas `#f2f5f3` and text `#12201b`; use the unanimous HTML token values.
- **Navigation:** explicit rendered overrides use selected `#dceee8`, border `#d9e1dd`, inactive icon `#5b6b64`. Preserve these scoped values. Exactly four tabs, active filled icon plus label within an inner pill; inactive outline icons only. No extra assistant control.
- **Type:** all configurations specify Sora headings (18/20/26/32) and DM Sans body/labels (11/13/15/17). The picker screenshot displays serif fallback text in several places, despite those declarations; use the consistently declared fonts and bundle them locally in Android. No font files are included in the ZIPs. Convert em tracking to absolute React Native letterSpacing values.
- **Spacing:** 4, 8, 16, 24, 32 rhythm, 20 horizontal page margin, 16 gutter. Convert CSS rem using a 16px base to Android dp; retain text scaling rather than freezing screenshot dimensions. Login's 24px padding is a screen-specific exception.
- **Radii:** shared Tailwind configuration is 4 default / 8 lg / 12 xl / 9999 full. Actual layouts also use 14px fields, 16px Home/check-in cards, 20px session/activity cards and 24px sheets. Preserve semantic variants instead of following the prose's blanket 20px-card rule. Signup/Settings should use these same variants.
- **Shadows:** retain light card shadows and the explicit tab-bar shadow `0 4px 20px -2px rgba(0,0,0,0.06)`. Android elevation values 1/4/8 for cards/nav/sheets are implementation estimates requiring device visual review, not measurements extracted from screenshots.
- **Handoff:** retain green-to-`#14302a` gradient and calm rings. 3-second duration comes from the product brief. Reduce decorative motion when the device requests reduced motion.
- **Touch targets:** the source includes 28px clear controls and 40px close buttons; native touch areas will be at least 48dp, exceeding the requested 44 minimum. Do not enlarge the visible icon unnecessarily. Keep labels, errors and supporting text legible rather than copying low-opacity text indiscriminately.

## Required behavioral differences from the images

1. Picker contains **only presets**. Remove the exported “Add your own” chip. Enforce 3–5 presets with “N of 5 selected”; save/continue disabled below 3. Settings editing must preserve custom interests and remove stale session selection IDs if a saved preset is removed.
2. Home supports **1–3** selected interests, not the exported single-selection behavior. Show selected fill/outline and checkmark. Use the first selected name with +1/+2 for the CTA. A fourth selection shows “Pick up to 3 for a focused session.”
3. Only Home creates custom interests. Trim input, require a nonempty name, cap it at 24 characters, reject case-insensitive duplicates, and cap custom interests at 10. Auto-select the new interest. When all three session slots are occupied, creating a custom interest should replace the most recently selected session interest, with an explanatory message, so auto-selection and the three-interest limit both hold. This is an implementation decision for the unspecified edge case; no saved interest is deleted.
4. Settings exposes a separate “Your own” deletion section, never an add action. Persist `savedInterests` separately from `selectedInterestIds`.
5. Intent and handoff support all chosen interests, correctly joined for one, two or three. The bottom sheet sits over the actual Home screen, not the exported “Digital Clarity” placeholder.
6. Correct onboarding labels to “Step 1 of 2” and “Step 2 of 2”; the session-length export incorrectly says “Step 3 of 3”.
7. Replace “the feed closes automatically” with “We'll remind you when your time is up.” Fedd cannot close or filter Instagram. Remove the activity footer's unsupported “resets your dopamine baseline” claim; use “A short pause can help you refocus.”
8. Authentication is a local mock behind an interface, clearly identified as such. Do not imply working Google/Apple sign-in, password reset, or secure remote accounts. Omit unsupported provider actions from the working first version. Never request Instagram credentials or persist plaintext passwords.
9. Treat the screenshot notification as an OS notification example, not a fake system banner drawn inside Check-in. Notification permission, scheduling, tap handling and app-resume recovery need real Android testing. Use a persisted end timestamp; JavaScript timers alone will not reliably run while Instagram is foregrounded. Silent mode must not vibrate or play sound.
10. Check-in's five-minute extension continues the current session, schedules a new reminder, and reopens Instagram. It does not inflate the number of sessions started. Satisfied vs distracted uses completed outcomes; extensions are not a third completed outcome. Empty Insights starts at zero, not the example's 14/11 metrics.
11. Saved ideas presents either the actual list or the empty state. Remove the mockup's “Preview” badge and “EMPTY STATE PREVIEW” separator. Use real dates, counts and user content; no seeded claims about progress.
12. Shortcut setup explains opening Fedd manually or using a Fedd shortcut. Do not promise interception of Instagram launches. Isolate the unofficial Instagram URL and hashtag web fallback in one module; URL-encode the normalized first interest. Test installed/uninstalled, back navigation, permission denial and process recreation on Android. No iOS URL declarations.

## Verification and next milestone

Milestone 1 contains design assets and theme data only. Confirm 11 PNG/HTML pairs and 10 matching app token sets by running `node scripts/extract-design-tokens.cjs`. A runtime import of `src/theme/tokens.ts` verifies TypeScript parsing, not full type checking.

TypeScript, ESLint and an app test runner are not yet configured in this empty workspace, so type check, lint and unit tests cannot run until project setup in milestone 2. Do not report these as passing. Java and adb were not found on PATH during initial inspection; this does not establish whether Android Studio/SDK are installed elsewhere. Check/install the build toolchain before promising a generated APK.

Next: initialize an Android-only React Native Community CLI project, bundle fonts, add React Navigation and build the theme/navigation shell. Later milestones add local storage, native Android reminders and the required interest-rule tests. The user brief requests a stop and summary after each milestone; this checkpoint stops before project setup.
