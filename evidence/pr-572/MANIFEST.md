# Evidence manifest: combined native session for PR #572

Captured 2026-10-03. Evidence only: no code, commits, reseed or Railway config changes.

## Environment

| Item | Value |
|---|---|
| Railway project | `176ddec0-dd65-4087-b82c-798599fc2ebe` |
| PR 572 environment | `f02a48cf-4bbd-40b5-a61f-64aeb7870440` |
| API service | `6db6f1b1-5c7a-4033-88d0-53f5f315bfc0` |
| API deployment / backend SHA | `e0f699c8-2b71-42d9-abc7-40aeb1c761af` / `ad25c4c4` (from the handoff; I did not re-read the deployment record). `/readyz` returned 200 at the end. |
| Integration head | `d5fbb688` (evidence worktree and `origin` agreed at start) |
| Simulators | A: iPhone 17 `38747B85-BB39-48A2-BF0D-4DD6A5ED1D13` (buyer). B: "AutoTM PR558 iPhone 17" `8F62B4B5-BD9D-4FEF-89B2-1011610DF2A0` (seller). Both iOS 26.2. No small phone (SE-size) simulator is installed (smallest is iPhone 16e). |
| Metro | port 8091, my process only, stopped at the end (8091 free) |
| Docker check | `pgrep -fl "Docker Desktop\|com.docker.backend"` printed nothing. Only the always-present `/Library/PrivilegedHelperTools/com.docker.vmnetd` (pid 599) is running. |

Both simulators were found shut down at the start and were booted by me. Each theme pair was taken by switching the simulator appearance (`snap.sh`, 1.2 s settle). A few dark frames may catch the end of the transition (status bar clock can look dim); retake if one looks off.

## Theme "System" follows the device: verified

With Cabinet > Theme = System, a fresh launch picked up the simulator's dark appearance, and switching `simctl ui appearance` light and dark changed the app live in both directions. The handoff's earlier failure did not reproduce, so it was most likely a stale state. Not a bug as far as I can tell.

## Captures per PR

Dark and light are paired by suffix. Language is the app language at capture time.


### #561 Help / About

| File | State | Language | Theme |
|---|---|---|---|
| 561-about-en-dark.png | about | EN | dark |
| 561-about-en-light.png | about | EN | light |
| 561-about-ru-dark.png | about | RU | dark |
| 561-about-ru-light.png | about | RU | light |
| 561-about-tk-dark.png | about | TK | dark |
| 561-about-tk-light.png | about | TK | light |
| 561-cabinet-signed-out-en-dark.png | cabinet-signed-out | EN | dark |
| 561-cabinet-signed-out-en-light.png | cabinet-signed-out | EN | light |
| 561-cabinet-signed-out-ru-dark.png | cabinet-signed-out | RU | dark |
| 561-cabinet-signed-out-ru-light.png | cabinet-signed-out | RU | light |
| 561-cabinet-signed-out-tk-dark.png | cabinet-signed-out | TK | dark |
| 561-cabinet-signed-out-tk-light.png | cabinet-signed-out | TK | light |
| 561-help-email-copy-menu-en-dark.png | help-email-copy-menu | EN | dark |
| 561-help-email-copy-menu-en-light.png | help-email-copy-menu | EN | light |
| 561-help-email-fallback-en-dark.png | help-email-fallback | EN | dark |
| 561-help-email-fallback-en-light.png | help-email-fallback | EN | light |
| 561-help-en-dark.png | help | EN | dark |
| 561-help-en-light.png | help | EN | light |
| 561-help-ru-dark.png | help | RU | dark |
| 561-help-ru-light.png | help | RU | light |
| 561-help-tk-dark.png | help | TK | dark |
| 561-help-tk-light.png | help | TK | light |

### #561 + #562 Cabinet rows

| File | State | Language | Theme |
|---|---|---|---|
| 561-562-cabinet-signed-in-en-dark.png | cabinet-signed-in | EN | dark |
| 561-562-cabinet-signed-in-en-light.png | cabinet-signed-in | EN | light |
| 561-562-cabinet-signed-in-ru-dark.png | cabinet-signed-in | RU | dark |
| 561-562-cabinet-signed-in-ru-light.png | cabinet-signed-in | RU | light |
| 561-562-cabinet-signed-in-tk-dark.png | cabinet-signed-in | TK | dark |
| 561-562-cabinet-signed-in-tk-light.png | cabinet-signed-in | TK | light |
| 561-562-cabinet-signed-out-ru-light.png | cabinet-signed-out | RU | light |

### #562 Notifications

| File | State | Language | Theme |
|---|---|---|---|
| 562-notifications-off-after-settings-ru-dark.png | notifications-off-after-settings | RU | dark |
| 562-notifications-off-after-settings-ru-light.png | notifications-off-after-settings | RU | light |
| 562-notifications-off-en-dark.png | notifications-off | EN | dark |
| 562-notifications-off-en-light.png | notifications-off | EN | light |
| 562-notifications-off-ru-dark.png | notifications-off | RU | dark |
| 562-notifications-off-ru-light.png | notifications-off | RU | light |
| 562-notifications-off-tk-dark.png | notifications-off | TK | dark |
| 562-notifications-off-tk-light.png | notifications-off | TK | light |
| 562-notifications-on-after-settings-ru-dark.png | notifications-on-after-settings | RU | dark |
| 562-notifications-on-after-settings-ru-light.png | notifications-on-after-settings | RU | light |
| 562-notifications-on-ru-dark.png | notifications-on | RU | dark |
| 562-notifications-on-ru-light.png | notifications-on | RU | light |
| 562-system-permission-prompt-ru-light.png | system-permission-prompt | RU | light |

### #564 Minimal Profile

| File | State | Language | Theme |
|---|---|---|---|
| 564-add-email-empty-en-dark.png | add-email-empty | EN | dark |
| 564-add-email-empty-en-light.png | add-email-empty | EN | light |
| 564-change-phone-sheet-en-dark.png | change-phone-sheet | EN | dark |
| 564-change-phone-sheet-en-light.png | change-phone-sheet | EN | light |
| 564-change-phone-sheet-ru-xxl-dark.png | change-phone-sheet | RU (XXL font) | dark |
| 564-change-phone-sheet-ru-xxl-light.png | change-phone-sheet | RU (XXL font) | light |
| 564-phone-already-yours-en-dark.png | phone-already-yours | EN | dark |
| 564-phone-already-yours-en-light.png | phone-already-yours | EN | light |
| 564-phone-refused-en-dark.png | phone-refused | EN | dark |
| 564-phone-refused-en-light.png | phone-refused | EN | light |
| 564-profile-phone-name-en-dark.png | profile-phone-name | EN | dark |
| 564-profile-phone-name-en-light.png | profile-phone-name | EN | light |
| 564-profile-phone-name-ru-xxl-dark.png | profile-phone-name | RU (XXL font) | dark |
| 564-profile-phone-name-ru-xxl-light.png | profile-phone-name | RU (XXL font) | light |

### #560 Delete account

| File | State | Language | Theme |
|---|---|---|---|
| 560-delete-confirm-dialog-en-dark.png | delete-confirm-dialog | EN | dark |
| 560-delete-confirm-dialog-en-light.png | delete-confirm-dialog | EN | light |
| 560-delete-ticked-en-dark.png | delete-ticked | EN | dark |
| 560-delete-ticked-en-light.png | delete-ticked | EN | light |
| 560-delete-unticked-en-dark.png | delete-unticked | EN | dark |
| 560-delete-unticked-en-light.png | delete-unticked | EN | light |
| 560-delete-unticked-tk-dark.png | delete-unticked | TK | dark |
| 560-delete-unticked-tk-light.png | delete-unticked | TK | light |

### #566 Code screen

| File | State | Language | Theme |
|---|---|---|---|
| 566-code-10min-email-en-dark.png | code-10min-email | EN | dark |
| 566-code-10min-email-en-light.png | code-10min-email | EN | light |
| 566-code-5min-en-dark.png | code-5min | EN | dark |
| 566-code-5min-en-light.png | code-5min | EN | light |
| 566-code-5min-ru-dark.png | code-5min | RU | dark |
| 566-code-5min-ru-light.png | code-5min | RU | light |
| 566-code-5min-tk-dark.png | code-5min | TK | dark |
| 566-code-5min-tk-light.png | code-5min | TK | light |
| 566-code-expired-en-dark.png | code-expired | EN | dark |
| 566-code-expired-en-light.png | code-expired | EN | light |
| 566-resend-countdown-3m57-ru-dark.png | resend-countdown-3m57 | RU | dark |
| 566-resend-countdown-3m57-ru-light.png | resend-countdown-3m57 | RU | light |
| 566-resend-minutes-countdown-en-dark.png | resend-minutes-countdown | EN | dark |
| 566-resend-minutes-countdown-en-light.png | resend-minutes-countdown | EN | light |

### #567 Messages list

| File | State | Language | Theme |
|---|---|---|---|
| 567-messages-list-own-last-read-ru-dark.png | messages-list-own-last-read | RU | dark |
| 567-messages-list-own-last-read-ru-light.png | messages-list-own-last-read | RU | light |
| 567-messages-list-ru-dark.png | messages-list | RU | dark |
| 567-messages-list-ru-light.png | messages-list | RU | light |
| 567-messages-list-seller-en-dark.png | messages-list-seller | EN | dark |
| 567-messages-list-seller-en-light.png | messages-list-seller | EN | light |
| 567-messages-list-two-rows-en-dark.png | messages-list-two-rows | EN | dark |
| 567-messages-list-two-rows-en-light.png | messages-list-two-rows | EN | light |
| 567-messages-list-two-rows-tk-dark.png | messages-list-two-rows | TK | dark |
| 567-messages-list-two-rows-tk-light.png | messages-list-two-rows | TK | light |
| 567-messages-signed-out-ru-dark.png | messages-signed-out | RU | dark |
| 567-messages-signed-out-ru-light.png | messages-signed-out | RU | light |

### #569 Push-opened Conversation

| File | State | Language | Theme |
|---|---|---|---|
| 569-back-goes-to-messages-ru-dark.png | back-goes-to-messages | RU | dark |
| 569-back-goes-to-messages-ru-light.png | back-goes-to-messages | RU | light |
| 569-not-found-conversation-ru-dark.png | not-found-conversation | RU | dark |
| 569-not-found-conversation-ru-light.png | not-found-conversation | RU | light |
| 569-push-open-conversation-signed-in-ru-dark.png | push-open-conversation-signed-in | RU | dark |
| 569-push-open-conversation-signed-in-ru-light.png | push-open-conversation-signed-in | RU | light |
| 569-push-open-signed-out-ru-dark.png | push-open-signed-out | RU | dark |
| 569-push-open-signed-out-ru-light.png | push-open-signed-out | RU | light |
| 569-sign-in-returns-to-conversation-ru-dark.png | sign-in-returns-to-conversation | RU | dark |
| 569-sign-in-returns-to-conversation-ru-light.png | sign-in-returns-to-conversation | RU | light |

### #570 Conversation menu

| File | State | Language | Theme |
|---|---|---|---|
| 570-block-confirm-dialog-ru-dark.png | block-confirm-dialog | RU | dark |
| 570-block-confirm-dialog-ru-light.png | block-confirm-dialog | RU | light |
| 570-blocked-footer-banner-ru-dark.png | blocked-footer-banner | RU | dark |
| 570-blocked-footer-banner-ru-light.png | blocked-footer-banner | RU | light |
| 570-menu-blocked-ru-dark.png | menu-blocked | RU | dark |
| 570-menu-blocked-ru-light.png | menu-blocked | RU | light |
| 570-menu-default-ru-dark.png | menu-default | RU | dark |
| 570-menu-default-ru-light.png | menu-default | RU | light |
| 570-menu-muted-ru-dark.png | menu-muted | RU | dark |
| 570-menu-muted-ru-light.png | menu-muted | RU | light |
| 570-report-other-text-ru-dark.png | report-other-text | RU | dark |
| 570-report-other-text-ru-light.png | report-other-text | RU | light |
| 570-report-reasons-ru-dark.png | report-reasons | RU | dark |
| 570-report-reasons-ru-light.png | report-reasons | RU | light |
| 570-report-thanks-ru-dark.png | report-thanks | RU | dark |
| 570-report-thanks-ru-light.png | report-thanks | RU | light |
| 570-unblock-confirm-dialog-ru-dark.png | unblock-confirm-dialog | RU | dark |
| 570-unblock-confirm-dialog-ru-light.png | unblock-confirm-dialog | RU | light |

### #571 Message bubbles

| File | State | Language | Theme |
|---|---|---|---|
| 571-buyer-own-message-chips-remain-ru-dark.png | buyer-own-message-chips-remain | RU | dark |
| 571-buyer-own-message-chips-remain-ru-light.png | buyer-own-message-chips-remain | RU | light |
| 571-buyer-own-messages-chips-remain-ru-dark.png | buyer-own-messages-chips-remain | RU | dark |
| 571-buyer-own-messages-chips-remain-ru-light.png | buyer-own-messages-chips-remain | RU | light |
| 571-conversation-existing-ru-dark.png | conversation-existing | RU | dark |
| 571-conversation-existing-ru-light.png | conversation-existing | RU | light |
| 571-conversation-salamat-ru-dark.png | conversation-salamat | RU | dark |
| 571-conversation-salamat-ru-light.png | conversation-salamat | RU | light |
| 571-conversation-seller-read-en-dark.png | conversation-seller-read | EN | dark |
| 571-conversation-seller-read-en-light.png | conversation-seller-read | EN | light |
| 571-image-bubble-broken-image-ru-dark.png | image-bubble-broken-image | RU | dark |
| 571-image-bubble-broken-image-ru-light.png | image-bubble-broken-image | RU | light |
| 571-image-bubble-broken-image-seller-en-dark.png | image-bubble-broken-image-seller | EN | dark |
| 571-image-bubble-broken-image-seller-en-light.png | image-bubble-broken-image-seller | EN | light |
| 571-new-conversation-empty-quick-replies-ru-dark.png | new-conversation-empty-quick-replies | RU | dark |
| 571-new-conversation-empty-quick-replies-ru-light.png | new-conversation-empty-quick-replies | RU | light |
| 571-own-message-quick-replies-ru-dark.png | own-message-quick-replies | RU | dark |
| 571-own-message-quick-replies-ru-light.png | own-message-quick-replies | RU | light |
| 571-own-message-read-ru-dark.png | own-message-read | RU | dark |
| 571-own-message-read-ru-light.png | own-message-read | RU | light |
| 571-read-label-after-reopen-ru-dark.png | read-label-after-reopen | RU | dark |
| 571-read-label-after-reopen-ru-light.png | read-label-after-reopen | RU | light |
| 571-seller-replied-chips-gone-ru-dark.png | seller-replied-chips-gone | RU | dark |
| 571-seller-replied-chips-gone-ru-light.png | seller-replied-chips-gone | RU | light |
| 571-seller-reply-seller-view-en-dark.png | seller-reply-seller-view | EN | dark |
| 571-seller-reply-seller-view-en-light.png | seller-reply-seller-view | EN | light |

### UI findings requested by founder (not tied to one PR)

| File | State | Language | Theme |
|---|---|---|---|
| ui-composer-placeholder-send-alignment-no-chips-ru-dark.png | composer-placeholder-send-alignment-no-chips | RU | dark |
| ui-composer-placeholder-send-alignment-no-chips-ru-light.png | composer-placeholder-send-alignment-no-chips | RU | light |
| ui-composer-placeholder-send-alignment-ru-dark.png | composer-placeholder-send-alignment | RU | dark |
| ui-composer-placeholder-send-alignment-ru-light.png | composer-placeholder-send-alignment | RU | light |
| ui-composer-with-text-send-enabled-ru-dark.png | composer-with-text-send-enabled | RU | dark |
| ui-composer-with-text-send-enabled-ru-light.png | composer-with-text-send-enabled | RU | light |
| ui-conversation-header-no-image-thumb-ru-dark.png | conversation-header-no-image-thumb | RU | dark |
| ui-conversation-header-no-image-thumb-ru-light.png | conversation-header-no-image-thumb | RU | light |
| ui-no-photo-feed-ru-dark.png | no-photo-feed | RU | dark |
| ui-no-photo-feed-ru-light.png | no-photo-feed | RU | light |
| ui-no-photo-listing-detail-ru-dark.png | no-photo-listing-detail | RU | dark |
| ui-no-photo-listing-detail-ru-light.png | no-photo-listing-detail | RU | light |

## Notable captured states and numbers

- #561: Cabinet signed out (RU/EN/TK) and signed in (RU/EN/TK, 561-562 files). Help in EN/RU/TK. Help after Email us with no mail app: message "Couldn't open a mail app. Copy the address:", selectable address, long-press shows Copy (`561-help-email-copy-menu-en-*`). About in EN/RU/TK with Version 0.1.0.
- #562: Notifications first row (Bell) when signed in; no row when signed out. Off (RU/EN/TK) is from before permission was ever asked. On (RU) after allowing the system prompt. Round trip verified in RU: Open system settings > Settings > Apps > AutoTM > Notifications off, back to app shows Off without restart; on again, back shows On.
- #564: phone + name profile (EN, RU at XXL font); Change phone? sheet EN and RU at XXL; "This is already your number"; refused screen for phone ("This number is used by another account... Accounts are never merged").
- #560: Delete account unticked and ticked (EN), confirm dialog (EN), unticked TK. I cancelled the dialog; no account was deleted.
- #566: 5-minute line (EN/RU/TK), 10-minute line on the email code screen, "Code expired" error, minutes countdown (1:52, 3:57).
- #567: list with two and three rows (EN/TK/RU), seller view, own-last-message row with read ticks, Photo preview row, no-image listing placeholder; signed out with Sign in (RU).
- #569: `openurl` to a Conversation signed in; signed out (gate with Sign in), then sign-in returns to the Conversation; missing id shows "Переписка не найдена" with "К сообщениям", which goes to Messages.
- #570: ⋯ menu default, muted (Unmute) and blocked (Unblock); report reasons, Other with text field, thanks screen; Block confirm; blocked footer banner; Unblock confirm.
- #571: times, ✓ / ✓✓, Read ("Прочитано" / "Read") under the last own Message, Today separator (existing, seller view, after reopen); quick replies in an empty new Conversation, still shown after the buyer's own messages, gone after the seller replied; image bubble.

## Not verified

| Item | Reason |
|---|---|
| Email add/confirm, "Added"/"Changed" line, refused-value screen for email, email-only profile, phone+email profile, long email on Profile | The email code is sent by the worker through the real email provider and only a masked address is logged, so I could not read the code. Only the Add email entry and the 10-minute code screen are captured. |
| #564 name-less profile variants | All fixture accounts have names. |
| #560 failure message, scheduled screen and Done > signed-out Cabinet | No failing path was reachable, and there is no disposable account. I did not confirm deletion on a fixture. |
| #562 On state and Off > settings > On in EN and TK | Done in RU only. Before the prompt appeared, the app was not listed in Settings, and `simctl privacy grant` is not permitted here. |
| #561 Call us with no phone app | Tapping Call us showed no message and no change (the email message was still displayed from before). Unclear whether it opened or silently did nothing. |
| #561 Help with a mail app present | Not tried. |
| #566 not-arriving hint and "Use phone instead" | The countdown finished with only "Resend code" shown, no hint. I did not resend repeatedly to trigger it. |
| #566 daily-limit state | Not reachable without spending the SMS budget. |
| #566 keyboard on a small phone | The simulators use the hardware keyboard, so the on-screen keyboard never showed; no small simulator exists. |
| #567 empty state | Every fixture account already has conversations. |
| #569 real push tap | `xcrun simctl push` delivered the banner, but tapping it through the simulator tool dismissed it without opening the app. The `openurl` path is not the push-tap hook, and Back from it went to the feed (the tab I had been on), not Messages. So "Back reaches Messages" is **not verified** for a push tap. |
| #570 muted-and-blocked together; report between accounts of the other direction | Not tried. |
| #571 failed Message with Retry | Needs the Mac network off, which would also cut Railway access mid-session; skipped. |
| #571 older-page loading row and inline Retry | The fixture threads have fewer messages than a page. |
| #571 image bubble content | Image sent, but both sides show a broken-image placeholder (see Bugs). Layout, time and ticks are captured. |

## Bugs seen

1. **Composer alignment (founder request).** In the Conversation composer the placeholder / typed text sits low in the pill; the paperclip and the send circle are not vertically centred against the pill. Files: `ui-composer-placeholder-send-alignment-ru-light.png`, `ui-composer-placeholder-send-alignment-ru-dark.png`, `ui-composer-placeholder-send-alignment-no-chips-ru-light.png`, `ui-composer-placeholder-send-alignment-no-chips-ru-dark.png`, `ui-composer-with-text-send-enabled-ru-light.png`, `ui-composer-with-text-send-enabled-ru-dark.png`.
2. **"No photo" in Russian is big and ugly (founder request).** In the Conversation header the listing thumbnail label "Нет изображения" wraps to three clipped lines (EN "No image" fits on one line). The feed tile "Нет фото" and the listing detail hero are also captured for comparison. Files: `ui-conversation-header-no-image-thumb-ru-light.png`, `ui-conversation-header-no-image-thumb-ru-dark.png`, `ui-no-photo-feed-ru-light.png`, `ui-no-photo-feed-ru-dark.png`, `ui-no-photo-listing-detail-ru-light.png`, `ui-no-photo-listing-detail-ru-dark.png`; also visible in `571-new-conversation-empty-quick-replies-ru-*.png`, `571-seller-reply-seller-view-en-*.png`, `571-seller-replied-chips-gone-ru-*.png`.
3. **Add email shows the red "Enter a valid email address." on an empty, untouched field**, then switches to the grey hint once the address is valid. File: `564-add-email-empty-en-light.png`, `564-add-email-empty-en-dark.png`.
4. **Image bubble shows a broken-image icon on both sides** after sending a photo (sender and receiver). Could be a PR-environment media issue (chat bucket URL) rather than an app bug; not diagnosed. Files: `571-image-bubble-broken-image-ru-*.png`, `571-image-bubble-broken-image-seller-en-*.png`.
5. **Read state did not update live in an open Conversation.** After the seller opened the thread, the buyer's open screen kept a single ✓ and no Read; reopening showed ✓✓ and "Прочитано". Later in the Nissan thread it did update live, so it may be timing. Files: `571-own-message-read-ru-*.png` (before) vs `571-read-label-after-reopen-ru-*.png` (after).
6. **New Conversation did not show the sent bubbles for over 10 s** (composer cleared, still "no messages yet"); they appeared after leaving and returning. No message POST appears in the API log, so sends go over the socket. Files: `571-buyer-own-message-chips-remain-ru-*.png` (shows empty state after the first send).
7. **Unblock confirm: banner stayed for roughly 10-20 s** after the first confirm tap and needed another tap to clear; the API log shows the DELETE. Could be a missed tap. Files: `570-unblock-confirm-dialog-ru-*.png`.
8. **Report thanks screen repeats the sentence twice** ("Спасибо, мы получили вашу жалобу" in the subtitle and in the body). Files: `570-report-thanks-ru-*.png`.
9. **Message time format follows app language, not device** (24 h in RU, "2:03 PM" in EN). The #571 PR body calls this a kept product call, listed here for completeness.
10. **Dev-build error toast ("[apiClient] request failed") appears in some frames** after expected 4xx responses (expired code, missing conversation, refused phone). Dev-only, but it is in `564-phone-refused-en`, `566-code-expired-en` and `569-not-found-conversation-ru` captures.

## Left clean

Theme System on both, language RU on both, font size default (large), both simulators in light appearance. A's conversation unmuted and unblocked (checked in the API log and UI). The buyer is signed in on A and the seller on B. Left behind in the PR environment: one extra Conversation (buyer to seller, Nissan Almera) with three messages, one image message, one report ("Evidence run report"), and one email code sent to a masked example.com address. On simulator A the dev client now has notification permission and full photo library access granted; I did not check B's permission state.

