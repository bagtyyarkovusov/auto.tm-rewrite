# Android evidence, PR #555 (issue #520): partial

- App commit tested: b6e9f00ce6fd65563ecd2f63080f3b0c183a80d8 (PR head at the time)
- Native build commit: unverified (existing debug dev build; PR changes JavaScript only)
- Device: Medium_Phone_API_36.1 (Android emulator)
- Railway environment: auto.tm-rewrite-pr-555 (8be8da9e-a0c6-4956-aca5-9a1f00e14be5)
- Deployments: API b45276ee-5ae2-41c8-a922-e8f6d77ef998, worker e1c26f28-f7b4-45cd-9c59-009af89e073d (both SUCCESS)
- /readyz commitSha: b6e9f00ce6fd65563ecd2f63080f3b0c183a80d8

| # | State | Result |
|---|---|---|
| 1 | Cabinet, signed out (light, dark) | Pass |
| 2 | Cabinet, signed in as fixture seller (light, dark) | Pass |
| 3 | Russian, light | Pass: labels fit, nothing truncated |
| 4 | Profile bottom (light, dark) | Pass: Log out, then Delete account in red, below Sign-in methods and Member since |
| 5 | Log out dialog (light, dark) | Pass: Cancel keeps the User signed in on Profile |
| 6 | Signed-out toast after confirming Log out | NOT VERIFIED: see below |

Other checks
- Delete account on Profile opens the existing Delete account screen: pass (not confirmed).
- Terms of Service opened `/en/legal/terms`: pass. Host was localhost:3002 because no web URL was set for Metro. Privacy Policy not observed live; it uses the same `legalPageUrl` helper.
- Rows at least 44 pt: rows measured 147 px (about 56 dp) in uiautomator bounds; the profile row 199 px.

Row 6 is open. The first attempt ended on the sign-in screen, and closing it led to onboarding "Choose language"; I could not tell whether that is a Log out defect or another session using the same emulator and app ID (the emulator went offline once and the app reset). After the app restart the session was gone, so Log out has not been reproduced cleanly. Needs a fresh sign-in and one clean Log out run. The toast screenshot is not included.
