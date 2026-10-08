# Release emulator pass 2: Android, first Google Play release

Evidence only. No app code changed. This pass re-ran the 15 defects from the [first pass](../release-emulator-pass/report.md) against the fixes merged since, and checked five further changes. The agent that drove the emulator on 2026-10-08 stopped before writing a report. A second agent wrote this one from that agent's time-ordered notes, its screenshots and the defect 5 log, without touching the device. Where this report adds something the notes do not say, it says so.

## Build and device

| Field | Value |
|---|---|
| Tested SHA | `fb26136abca32be09fc4304e8e1101ab5c5f8c8e` (`main` at the time; #773 merged later and is not in this build) |
| Build | Local `assembleRelease`, arm64 only |
| Signing | Android debug certificate. This is not the EAS store build. |
| APK SHA-256 | `679bf3a8193143635ab0c89e8768fe8e6d495d880b8ad9dbd1fb932880f7f1bf` |
| Backend | Staging API. Its deploy of the same commit was confirmed at 22:08. Checks before 22:08 (D1, D2, D4, D6, D7, D8, D10, D11 and most of B-iii) ran against whatever staging served earlier; the notes do not record that commit. B-i, which depends on the API change in #766, ran after. |
| Device | Emulator `Medium_Phone_API_36.1`, API 36, 1080x2400 at 420 dpi, software rendering (`-gpu swiftshader_indirect`), demo-mode status bar. Gesture navigation, with three-button navigation for the keyboard checks. |
| Accounts | Tester A and tester B. Phone numbers, emails and codes are masked in the screenshots (grey boxes). One more grey box hides tester B's default display name in 041, 044, 048 and 109. |

Fixes under test: #760 (calls, Listing and Sell defects), #761 (profile photo), #762 (chat and notification permission), #764 (wrong code on phone sign-in), #766, #767, #768, #771, #772.

## Verdicts: first-pass defects

Result counts: 13 pass (D6 among them, though N1 shows its screen can still appear), 1 still failing by a different route (D5), 1 not checked (D14).

| # | First-pass defect | Result | Screenshots |
|---|---|---|---|
| D1 | Call does nothing | PASS. The dialer opens with the seller's number from Listing detail, a Results card and the conversation header. | None committed: the dialer shows a phone number. |
| D2 | Keyboard covers the chat composer and the report details field | PASS, gesture and three-button navigation. A report was submitted with the keyboard open. | 039, 048 (composer), 045, 050 (report sheet) |
| D3 | Unreadable image as profile photo crashes the app | PASS. A message asks for JPEG, PNG or WebP, the app keeps running in the same process, the old photo stays. | 055 |
| D4 | Notification permission never requested | PASS. On fresh data the system prompt appeared right after the first sent message, before the Messages tab was opened. | 041 |
| D5 | Profile photo upload stays broken until restart | Not reproduced with the first-pass steps (two runs: throttled network and airplane mode; one Retry succeeded each time). FAIL by another route: see "Defect 5 root cause" below. | 059, 066 |
| D6 | Back after publishing lands on onboarding | PASS on the exact first-pass sequence: detail, Sell, Home, launcher. The onboarding screen does still appear after an Activity recreation: see N1. | 030 |
| D7 | Sender's own message does not appear | PASS. Four sends appeared at once, including with the keyboard open and after scrolling the history. A message sent to B through the API showed on B's open thread within the first poll, about 5 seconds. | 044, 103 |
| D8 | VIN accepts any text and is then locked | PASS. `Corolla` and a 17-character value containing `O` keep Continue disabled; lowercase input is uppercased and capped at 17. The older Listing whose VIN is "Corolla" can still be edited and saved. No error text is shown (observation 2). | 012, 035 |
| D9 | Wrong code on phone sign-in says the code expired | PASS. "Неверный код. Попробуйте еще раз."; the right code then signs in without Resend. | 101 |
| D10 | Empty conversation text upside down | PASS | 038 |
| D11 | Wizard camera silent after permanent denial | PASS. A dialog offers Open settings. | 019 |
| D12 | Russian plural on the filter button | PASS for 1, 2, 4, 5, 12, 14, 21, 22 and 54 matches. | 080 |
| D13 | "See all" keeps a dark pressed state in the light theme | PASS after going in and back twice. | 100 |
| D14 | Profile upload progress jumps from 0% to 100% | Not checked. | |
| D15 | "Last seen" is stale | PASS. B was active about 23:26; at 23:31 A's header said "был(а) только что". | 109 |

## Verdicts: changes checked

| # | Change | Result | Screenshots |
|---|---|---|---|
| B-i | #766: wrong guesses count against fixed-code phone sign-ins | PASS. Four wrong codes give "wrong code"; the fifth gives "Слишком много попыток. Подождите 15 минут и попробуйте снова." The right code is refused while locked. The message is localized in EN and TK. The other tester was not locked. | 101, 105 |
| B-ii | #767: Results card photo strip inset, no price pill | PASS. Plain price; the first photo spans 61% of the width with an 8 dp left and top inset; the strip end stops short of the right edge; photos are clipped by the card's rounded corner; a vertical scroll that starts on a photo scrolls the list. | 070, 074 |
| B-iii | #768: Sell wizard has one full-width bottom button, Back only in the header | FAIL on the keyboard step. Header chevron and hardware Back go from step 2 to step 1; Change from the Check step shows Done alone and returns to Check; Edit shows a close button and a full-width Save; the button clears the three-button bar. With the keyboard open on VIN, price or landmark, Continue is hidden behind it in both navigation modes. | 011, 053 |
| B-iv | #771: Home grid rows do not collapse | PASS twice: after loading page 2 and returning to the top, and after Cabinet, My listings, Home. Rows normal, no blank gap, the end of the list shows "Больше нет". | 004, 089 |
| B-v | #772: tab bar glass | PASS. Tab labels stay readable in light and dark and in EN, RU and TK. | 004, 100 |

Also passed in passing: add a favorite from Results and see it in Favorites; apply filters and sort by price; search by brand and model (Toyota, Camry, four results); sign in as A while B is locked.

## New defects

Severity uses the first pass's scale: **blocks release**, **should fix before release**, **can wait**. Paths are under `apps/mobile/`. Nothing found here blocks the store build on its own. Two fixes are already in flight, and the store build should be cut after they merge: open PR #776 covers the keyboard items, and branch `fix/chat-date-separator-vin-clear` covers N5 and N6.

| # | Defect | Severity | Blocks the store build |
|---|---|---|---|
| N1 | Activity recreation sends a signed-in user to onboarding | Should fix before release | No |
| N1b | Skeleton for one to two minutes after recreation | Can wait | No |
| D5 | Image picker dead after in-place Activity recreation | Should fix before release | No |
| B-iii | Wizard Continue hidden behind the keyboard | Should fix before release | No. Addressed by #776; build after it merges. |
| N4 | Filters price fields under the keyboard | Should fix before release | No. Addressed by #776; build after it merges. |
| N5 | Chat date separator below the first Message of the day | Should fix before release | No, but it shows in the store chat screenshots, which need retaking after the fix. |
| N6 | Cleared VIN comes back in a draft | Can wait | No |

### N1. Activity recreation sends a signed-in user to onboarding (should fix before release)

- Steps: sign in, open Profile, change the display density (`wm density 400`, then reset). Android recreates the Activity in the same process.
- Expected: Profile again.
- Actual: the onboarding language screen, "Выберите язык".
- Screenshot: 063.
- This is the likely real trigger of first-pass defect 6: that pass changed the screen size and density for its small-screen checks. The trigger tried here is a density change. A font or display size change in system settings recreates the Activity the same way, and so may the system destroying a backgrounded Activity. Neither was tried.
- From the screenshots, not the notes: after Back and a relaunch the language screen showed again; about three minutes later the same account was back on Profile, so the session was not lost.
- Likely file: `app/_layout.tsx` (`initialRouteName: "(onboarding)"`), as for defect 6. Not blocking: the only trigger shown needs a system display change while the app is open.

### N1b. Skeleton for one to two minutes after recreation (can wait)

- Steps: as N1, in a run where Profile did come back.
- Actual: Profile stayed on its loading skeleton for about two minutes, then recovered. Earlier, a conversation stayed on its skeleton for about one minute after a navigation-mode switch, which also recreates the Activity.
- Screenshot: 065.
- The emulator used software rendering, so the durations may be inflated.

### Defect 5 root cause. Image picker dead after in-place Activity recreation (should fix before release)

- Steps: on Profile, recreate the Activity in place (density change, or a navigation-mode switch), then Change photo, Choose from library.
- Expected: the system photo picker.
- Actual: "Не удалось загрузить фото." at once; the picker never opens. Force-stopping the app fixes it. This is the stuck state the first pass reported, and that pass changed size and density shortly before it.
- Screenshots: 066; 059 shows the first-pass steps succeeding. Log: [defect5-timeline.txt](defect5-timeline.txt), [defect5-app-process-logcat.txt](defect5-app-process-logcat.txt) (the app's own process, one pid throughout; it shows the React surface stopped and restarted and no error line from the app).
- Cause, from reading the code and not proven on device: `expo-modules-core`'s `AppContextActivityResultRegistry` unregisters its launchers when the Activity is destroyed, and `ImagePickerModule` registers its launcher only once, in `RegisterActivityContracts`. After an in-place recreation the launcher is gone.
- The upload path itself held: #761's Retry worked on a throttled network and after airplane mode. Not blocking, for the same reason as N1. N1, N1b and this share the trigger and should be looked at together.

### B-iii. Wizard Continue hidden behind the keyboard (should fix before release)

- Steps: Sell wizard, tap VIN (step 1), the price (step 4) or the landmark field.
- Expected: Continue stays above the keyboard, as #768 states.
- Actual: the field stays visible; Continue is behind the keyboard, in gesture and three-button navigation. The button is there again once the keyboard is closed, so the wizard can still be finished.
- Screenshots: 011, 053.
- Likely file: `src/listings/wizard/WizardLayout.tsx`, which has no keyboard avoidance. Open PR #776 addresses this.

### N4. Filters price fields under the keyboard (should fix before release)

- Steps: Results, Filters, tap the minimum or maximum price.
- Expected: the field and the Show button stay visible.
- Actual: both are covered by the keyboard. The value cannot be seen while typing.
- Screenshots: 081; 080 shows the same fields without the keyboard.
- Open PR #776 addresses this.

### N5. Chat date separator below the first Message of the day (should fix before release)

- Steps: open a new conversation and send two Messages.
- Expected: "Today" above the first Message.
- Actual: "Today" sits between the first and second Message. The thread between the two testers shows the same.
- Screenshot: 093.
- Being fixed on `fix/chat-date-separator-vin-clear`. The store chat screenshots taken in this pass show the defect.

### N6. Cleared VIN comes back in a draft (can wait)

- Steps: in a draft with VIN `CAMRY`, clear the field, wait for "Saved", close the wizard, reopen it.
- Expected: an empty VIN.
- Actual: `CAMRY` again. Done twice.
- No screenshot. Being fixed on `fix/chat-date-separator-vin-clear`.

## Minor observations

None of these blocks the store build; all can wait.

1. After leaving the app with Back from Home, the next launch opens Cabinet instead of Home.
2. An invalid VIN only disables Continue. #760 described a localized error message; none is shown (012).
3. After the keyboard is dismissed with Back while the composer is still focused, the composer rests about 24 dp above its normal place, in both navigation modes. This may be the emulator's hardware-keyboard setting.
4. The floating Filters button can sit over a Results card's Call button while scrolling (074).
5. Cabinet showed a stale My listings count (4) after Listings were archived through the API.
6. After a wrong code the code cells lose focus; the user must tap a cell to type again (101).
7. A slow, short drag on the Results photo strip snaps back to the first photo. Acceptable.
8. The onboarding screen in 063 runs edge to edge. #773 restored that padding on `main` after this build; it was not rechecked.

## Not checked

- D14, upload progress.
- The signed EAS store build, its permissions, and any API level other than 36. No physical device.
- Push delivery (the permission was granted, delivery was not tested) and tab haptics.
- Email sign-in, image Messages, small-screen layout, account screens, changing a phone or email, deleting an account.
- N1 and defect 5 with the triggers users are more likely to hit: font size, display size, or the system destroying a backgrounded Activity.
- Whether #776 and `fix/chat-date-separator-vin-clear` fix B-iii, N4, N5 and N6. Neither is in this build.
- iOS.

## Changes made on staging

- One moderation report from tester A, made from a conversation menu, reason Other, text "Second emulator pass test report. Please ignore." (045). The raw screenshots also show a report on a demo Listing; the notes do not mention it.
- New Listing "Toyota 4Runner, 2024" from tester A, left archived. A's "Audi 100, 2016" and "Toyota 4Runner, 2018" and B's "BMW 1 Series, 2019" were archived for the store screenshots and republished afterwards. The 2018 Listing's price is now 123 457 TMT.
- Tester A's profile photo changed. One favorite added. New Messages in the thread between the testers, and a new thread from A to a demo seller with two Messages (093).
- Tester B was locked out of phone sign-in for 15 minutes from 23:27.
- 18 store screenshots were captured (EN, RU, TK, six each, dark theme). They are not part of this evidence.

## Notes

- 30 of the 110 raw screenshots are committed, at 540x1200, under [screenshots/](screenshots/). Each was looked at before copying. Dialer screens and shots showing another tester's name were left out.
- With the host GPU the emulator captured a black screen, so it ran with software rendering. It hung once when the dialer launched and was cold-booted. Neither is an app defect.
- `adb shell input text` hides the on-screen keyboard unless `show_ime_with_hard_keyboard` is set to 1. The keyboard checks ran with it set.
