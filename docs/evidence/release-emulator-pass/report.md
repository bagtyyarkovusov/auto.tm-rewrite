# Release emulator pass: Android, first Google Play release

Evidence only. No app code changed. Two agents did this pass: the first drove checks 1 to 8 and stopped without notes; the second recovered its results from the command log and the screenshots, re-ran the doubtful ones, and did the rest. Where a result rests on a screenshot alone, the table says so.

## Build and device

| Field | Value |
|---|---|
| Tested SHA | `ee1931e9cc54fe0fb1799edd5a36997a9141f08d` (`main`) |
| Build | Local `./gradlew app:assembleRelease`, variant `release`, arm64 only, `tm.auto.app` 2.0.0 (versionCode 1), minSdk 24, targetSdk 36 |
| Signing | Android debug certificate. This is not the EAS store build. |
| APK SHA-256 | `2ecb82b0f853dc46e68359b71a6b903ca28f9b0037d662d5de9b7bfb1f1c603d` |
| Backend | Staging API `api-staging-2861`, same commit |
| Device | Emulator `Medium_Phone_API_36.1` (`sdk_gphone64_arm64`), Android 16, API 36, 1080x2400 at 420 dpi. Small-screen checks used a 360x640 dp override. |
| Accounts | Tester A and tester B from the tester file. Phones, emails and codes are masked in every screenshot (grey boxes are the capture script's mask; a few boxes cover harmless text). All 160 images were checked by OCR for tester values before commit. |

Result counts: 53 pass, 10 fail, 6 untested.

## Checklist

| # | Check | Result | Screenshots |
|---|---|---|---|
| 1.1 | Cold start after clearing data lands on Home | Pass | 001 |
| 1.2 | Cold start with system animations off | Pass | 111 |
| 1.3 | Languages RU, EN, TK | Pass | 002-004, 070-075 |
| 1.4 | Themes dark, light, system | Pass (defect 13) | 020-025 |
| 2.1 | Phone sign-in | Pass | 113, 115 |
| 2.2 | Email sign-in | Pass | 006, 008, 010 |
| 2.3 | Switching phone and email keeps both values (#733) | Pass | 006, 007 |
| 2.4a | Wrong code, email | Pass | 009 |
| 2.4b | Wrong code, phone | Fail (defect 9) | 114, 120 |
| 2.5 | Wrong code with Reduce Motion: no shake (#731) | Pass. Cell edge moved 1 px with animations off, 12 px with them on (measured from screen recordings, not committed). | 114, 120 |
| 2.6 | Sign out | Pass | 108, 112 |
| 2.7 | Second user sees nothing of the first | Pass | 115, 116 |
| 3.1 | Home | Pass | 001, 025, 121 |
| 3.2 | Search | Pass | 122 |
| 3.3 | Results | Pass | 012, 023, 123, 127 |
| 3.4 | Filters | Pass (defect 12) | 125, 125b, 126 |
| 3.5 | Sort | Pass | 124, 126 |
| 3.6 | #727 tab haptics and Android blur | Untested. The glass tab bar renders; haptics cannot be felt on an emulator. | 001 |
| 3.7 | #728 quiet Home search card | Pass | 001, 025 |
| 4.1 | Listing detail | Pass | 013, 024, 128 |
| 4.2 | Photo viewer: swipe, thumbnails, double-tap zoom, close | Pass | 014-016 |
| 4.3 | Favorites add and remove | Pass | 018, 019 |
| 4.4 | Contact: Call | Fail (defect 1) | 129, 159 |
| 4.5 | Contact: Message | Pass | 130 |
| 4.6 | Report a Listing | Untested. Only the menu was opened. | 017 |
| 5.1 | Sell wizard, steps 1 to 7 | Pass | 030-052 |
| 5.2 | VIN validation | Fail (defect 8) | 053, 055 |
| 5.3 | Photos: minimum of three, eight suggested, upload states | Pass | 036-041, 066 |
| 5.4 | Camera permission in the wizard: prompt, deny | Pass (defect 11) | 042-044, 118 |
| 5.5 | Draft saved and resumed | Pass | 048, 049 |
| 5.6 | Publish | Pass | 054, 055, 119 |
| 5.7 | Back after publishing | Fail (defect 6) | 064, 065 |
| 5.8 | Owner cards in My listings | Pass | 063 |
| 5.9 | Edit: Photos row correct from the first frame (#736) | Pass | 056-059 |
| 5.10 | Edit: add photos, save while uploading | Pass | 060-062 |
| 5.11 | Publish with an invalid photo shows the right message in EN, RU, TK (#735) | Pass | 067, 068, 070, 072 |
| 5.12 | Removing the bad photo lets the draft publish | Pass | 069, 073 |
| 6.1 | A sends B a first message | Pass | 134, 143 |
| 6.2 | Composer with the keyboard open | Fail (defect 2) | 132, 133, 145 |
| 6.3 | Empty conversation state | Fail (defect 10) | 130, 131 |
| 6.4 | Image message; attachment Remove is a 44 dp button (#732) | Pass | 135-137 |
| 6.5 | Unread counts | Pass | 141, 142, 161 |
| 6.6 | B's replies reach A, read receipts | Pass | 162 |
| 6.7 | Sender sees their own message after sending | Fail (defect 7) | 144, 146, 147, 158 |
| 6.8 | B reports A's message | Pass | 149-151 |
| 6.9 | Push notification delivery | Untested. The permission was never requested (defect 4) and the local build has no Firebase config. | 139 |
| 7.1 | Photo sheet: Remove only when a photo exists (#643) | Pass | 076, 089 |
| 7.2 | Camera denied: dialog and Open settings | Pass | 077, 078 |
| 7.3 | Take photo, crop, upload | Pass | 079-083 |
| 7.4 | Slow network: failure, then Retry | Pass | 084-086 |
| 7.5 | Remove photo | Pass | 090 |
| 7.6 | Library: no permission prompt, cancel changes nothing, crop | Pass | 091, 093, 094 |
| 7.7 | Unreadable file from the library | Fail (defect 3) | 092 |
| 7.8 | Offline failure, Retry after 23 minutes idle | Pass | 095, 096 |
| 7.9 | Sign out during an upload | Pass | 107, 108, 112 |
| 7.10 | Upload recovers after repeated failures | Fail (defect 5) | 109, 110 |
| 7.11 | B reports A's profile while A has a photo | Pass | 152-157 |
| 8.1 | Edit name with the keyboard | Pass | 097, 098 |
| 8.2 | Change phone screen with the keyboard | Pass | 099, 100 |
| 8.3 | Change email screen with the keyboard | Pass | 101 |
| 8.4 | Delete account screen | Pass | 102 |
| 8.5 | Small screen, 360x640 dp | Pass | 103-106 |
| 8.6 | System Back on account screens | Pass. Back was sent as a key event, not an edge swipe. | 099-102 |
| 8.7 | Completing a phone or email change | Untested. It would change the testers' sign-in values. | |
| 8.8 | Deleting an account | Untested. Destructive for a shared tester. | |
| 9.1 | Manifest permissions against section 3 of the submission doc | Pass, see below | |
| 9.2 | Camera runtime prompt | Pass | 042, 079 |
| 9.3 | Notification prompt after the first chat action | Fail (defect 4) | 134, 139 |
| 9.4 | Permissions of the signed store build | Untested. Only the local build was inspected. | |

## Permissions (item 9)

`aapt2 dump permissions` on the local release APK and `dumpsys package tm.auto.app` on the device.

Requested: `CAMERA`, `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` (both `maxSdkVersion=32`), `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `com.google.android.c2dm.permission.RECEIVE`, `VIBRATE`, `USE_BIOMETRIC`, `USE_FINGERPRINT`, `BIND_GET_INSTALL_REFERRER_SERVICE`, `tm.auto.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, and the launcher badge permissions (Samsung, HTC, Sony, Huawei, Oppo, Apex, Solid, Everything, `android.permission.READ_APP_BADGE`).

Every entry is in the table in section 3 of `docs/prd/ops/88-play-console-submission.md`. Nothing is requested that the table does not list.

Absent, as the release audit requires: `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED`, `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, every `ACCESS_*_LOCATION`, `ACCESS_MEDIA_LOCATION`, `com.google.android.gms.permission.AD_ID`, every `FOREGROUND_SERVICE*`. `android:allowBackup` is `false`.

Granted at the end of the pass: `CAMERA` (set by the user through the prompt). `POST_NOTIFICATIONS` is not granted and carries no user-set flag, so its prompt never appeared. The photo library never asked for a permission (system photo picker).

The manifest `<queries>` block lists `https`, document and camera intents, and no `tel:` or `DIAL` intent. That is the cause of defect 1.

## Defects

Severity: **blocks release**, **should fix before release**, **can wait**. Paths are under `apps/mobile/`.

### 1. Call does nothing (blocks release)

- Steps: sign in, open another seller's Listing that allows calls, tap Call (Позвонить).
- Expected: the dialer opens with the seller's number.
- Actual: nothing happens and nothing is shown. Reproduced by both agents, as buyer A and as buyer B. The emulator has a dialer, and `am start -a android.intent.action.DIAL` opens it.
- Screenshots: 129, 159.
- Likely file: `src/listings/components/ContactCtaBar.tsx` (`handleCall` calls `Linking.canOpenURL("tel:…")` first, which is false on Android 11 and later without a `tel` entry in `<queries>`). The same pattern is in `src/listings/feed/useListingCall.ts`, `src/listings/favorites/FavoriteListingCard.tsx`, `src/conversations/components/ConversationHeader.tsx`. `app.config.js` declares no `tel` query.

### 2. The keyboard covers the chat composer and the report details field (blocks release)

- Steps: open a conversation, tap the message field so the keyboard opens. Second case: conversation menu, Report, Other, tap the details field.
- Expected: the composer, or the details field and Submit, stay above the keyboard.
- Actual: the composer stays at the bottom, fully behind the keyboard. The typed text and Send cannot be seen until the keyboard is dismissed with Back. In the report sheet the details field and Submit are covered the same way.
- Screenshots: 132, 133, 145 (composer), 156 (report sheet).
- Likely file: `src/conversations/components/MessageComposer.tsx` (`KeyboardAvoidingView` with `behavior="height"` on Android, with `edgeToEdgeEnabled=true`); `src/admin/components/ReportSheet.tsx`. Seen on API 36 only; other API levels were not tested.

### 3. Picking an unreadable image as profile photo crashes the app (should fix before release)

- Steps: Profile, change photo, Choose from library, pick a file with a `.jpg` name that is not an image, confirm.
- Expected: an "unsupported photo" message.
- Actual: the app closes. `java.lang.IllegalArgumentException: Required value was null` at `expo.modules.imagepicker.contracts.CropImageContract.parseResult(CropImageContract.kt:66)`.
- Screenshot: 092 (launcher after the crash). Trace: [crash-corrupt-profile-photo.txt](crash-corrupt-profile-photo.txt).
- Likely file: `src/identity/useProfilePhotoUpload.ts` (library pick with the square crop); the throw is inside `expo-image-picker` 55.0.24.

### 4. The notification permission is never requested (should fix before release)

- Steps: fresh install on Android 13 or later, sign in, send a first message, open the Messages tab.
- Expected: the system notification prompt, as section 3 of the submission doc states ("asked after the first chat action").
- Actual: no prompt for either tester. `POST_NOTIFICATIONS` stays not granted with no user-set flag. Cabinet, Notifications shows "off" with only a link to system settings.
- Screenshots: 134, 139.
- Likely file: `src/notifications/requestNotificationPermission.ts` (`getNotificationPermissionState` returns "denied" for any `DENIED` status; Android reports that status before the first request) and `src/notifications/useChatPushTokenRegistration.ts`, which returns early on "denied". Cause inferred from the code, not proven on device.

### 5. Profile photo upload stays broken after failures until the app is restarted (should fix before release)

- Steps: Profile, pick a library photo on a throttled network so the upload fails. Tap Log out, then Cancel. Restore the network. Tap Retry.
- Expected: the upload succeeds.
- Actual: "Не удалось загрузить фото." returns at once on every Retry. Cancel, then picking a new photo from the library, fails the same way without opening the crop screen. The API accepted a presign request for the same account at that moment. Force-stopping the app fixed it. The exact trigger was not isolated.
- Screenshots: 109, 110.
- Likely file: `src/identity/useProfilePhotoUpload.ts`.

### 6. Back after publishing lands on the onboarding language screen (should fix before release)

- Steps: clear app data, launch (Home opens, no onboarding), sign in, publish a Listing from the wizard, open Edit and close it, press system Back on the owner's Listing detail, press Back again.
- Expected: Back returns to Sell or Home, then leaves the app.
- Actual: "Choose language" from onboarding appears, followed by the value-proposition pages. After a cold start, Back from Home leaves the app as expected, so this needs the publish flow. Seen once; the shortest path was not isolated.
- Screenshots: 064, 065.
- Likely file: `app/_layout.tsx` (`initialRouteName: "(onboarding)"`), `app/(onboarding)/index.tsx`.

### 7. The sender's own message does not appear in the thread (should fix before release)

- Steps: as B, open a conversation that already has messages, type a reply, send.
- Expected: the reply appears at the bottom of the thread.
- Actual: three of four sends did not appear. The first reply was sent twice because of this (12:46 and 12:47); both showed only after leaving and reopening the conversation. A third message, stored by the API at 12:49, was still missing 44 minutes later and appeared together with the fourth. A's sends in a new conversation appeared at once. The failed sends were made while the keyboard covered the composer (defect 2), which may be related.
- Screenshots: 144, 146, 147, 158.
- Likely file: `src/conversations/components/MessageList.tsx`, `src/conversations/components/MessageComposer.tsx` and the send hook under `src/api/conversations`.

### 8. VIN accepts any text and is then locked (should fix before release)

- Steps: Sell wizard step 1, type `Corolla` into VIN, finish and publish.
- Expected: an error, since the hint says 17 characters.
- Actual: accepted, published and shown to buyers as "VIN Corolla". Edit then says the VIN cannot be changed after publishing.
- Screenshots: 053, 055.
- Likely file: `src/listings/wizard/wizardErrors.ts` (only a maximum length), and the wizard schema in `packages/contracts`.

### 9. A wrong code on phone sign-in says the code expired (should fix before release, verify first)

- Steps: sign in by phone, request a code, type `000000`.
- Expected: "wrong code", and the same code still usable.
- Actual: "Код истек. Запросите новый." A new code had to be requested. Email sign-in shows "Wrong code. Try again." Both testers. This may be a side effect of the fixed tester codes (#713) and should be checked with a real number.
- Screenshots: 114, 120 (phone), 009 (email).
- Likely file: `components/auth/CodeEntryForm.tsx`, or the API's OTP verify path for tester phones.

### 10. The empty conversation text is upside down (should fix before release)

- Steps: open a new conversation from a Listing.
- Expected: "Пока нет сообщений. Начните переписку." upright.
- Actual: the line is rotated 180 degrees.
- Screenshots: 130, 131.
- Likely file: `src/conversations/components/MessageList.tsx` (inverted list with `ListEmptyComponent`).

### 11. Camera in the Sell wizard is silent once the permission is denied for good (can wait)

- Steps: wizard Photos step, tap Camera, deny twice, tap Camera again.
- Expected: a dialog with Open settings, as Profile shows.
- Actual: nothing happens.
- Screenshots: 044; compare 077.
- Likely file: `src/listings/wizard/Step2Photos.tsx` (`takePhoto`).

### 12. Russian plural on the filter button (can wait)

- Steps: Russian, Results, Filters with four matches.
- Expected: "Показать 4 объявления".
- Actual: "Показать 4 объявлений".
- Screenshot: 125.
- Likely file: `src/i18n/resources.ts`.

### 13. "See all" on Home keeps a dark pressed state in the light theme (can wait)

- Steps: light theme, Home, tap See all, go back.
- Expected: the plain label.
- Actual: a dark pill with an unreadable label.
- Screenshots: 025, 026.
- Likely file: `components/ui/pressable-scale.tsx` or the Home section header.

### 14. Profile upload progress jumps from 0% to 100% (can wait)

- Steps: upload a profile photo on a slow network.
- Expected: progress that moves.
- Actual: "0%" for about 20 seconds, then "100%".
- Screenshots: 081-083.
- Likely file: `src/identity/useProfilePhotoUpload.ts`.

### 15. "Last seen" is stale (can wait)

- Steps: B sends a message at 13:33; A opens the conversation at 13:38.
- Expected: last seen a few minutes ago.
- Actual: "был(а) 47 мин назад".
- Screenshot: 162.
- Likely file: `src/conversations/components/ConversationHeader.tsx` or the presence source in the API.

## Moderation reports created on staging

1. Tester B reported tester A's text message, reason Spam (149-151).
2. Tester B reported tester A's profile from the conversation menu while A had a profile photo, reason Other with the text "Release emulator pass test report. Please ignore." (152-157).

The app shows no report ID, and users have no endpoint that lists their reports.

## Test data left on staging

Tester A: display name "Tester A", a profile photo, Listings "Toyota 4Runner, 2018" (VIN "Corolla") and "Audi 100, 2016". Tester B: Listing "BMW 1 Series, 2019". One conversation between them with six messages.

## Notes

- The emulator rebooted once on its own during the wizard (host load). The draft survived (048, 049). Not an app defect.
- 074 shows Home loading in Turkmen. 059 and 094 are frame strips cut from screen recordings.
- In the light theme the status bar icons are dark over the Listing photo (055, 062). Not counted as a defect.
