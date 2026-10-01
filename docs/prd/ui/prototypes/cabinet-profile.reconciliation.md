# Cabinet and account prototype reconciliation, 2026-10-02

This is throwaway evidence for #353 on `prototype/cabinet-profile`. It is not an application implementation, a production PR, or founder approval of the surviving proposals. Preserve the branch and worktree.

Base: `93ee62bb7f7c9ecd52431dfc08e2338d57374ade`.
Salvage input SHA256: `6c79b25fdf7653edd61b1a922a16cfd726a85bb2ce803b7d00b971b825eecc0b`.
Reconciled HTML SHA256: `9bcbe81047e77b6b65d008bb7c35ef5823320382618e9b7f77202a256db17009`.

## Governing rules

- #353 founder feedback locks D2 to A, Phone / Email tabs. Other sign-in entry variants are removed.
- #344 keeps the five tabs and separate Cabinet, Profile and Settings. Cabinet C is removed; tab histories are preserved, and tapping the active tab returns to its first screen.
- ADR-0056 replaces ADR-0054's account-phone Sell gate. Email-only Users enter Sell; the placeholder explains verification of the Listing contact phone inside the wizard. #354 owns wizard, drafts and My listings design. This file supplies no wizard design or fake Publish result.
- ADR-0054 preserves authenticated in-app DELETE /me without an added OTP. Web deletion confirms a code. ADR-0032 supplies 30-day grace, session revocation, archive and explicit restoration. The prototype preserves the account's methods during a successful restoration.
- ADR-0054 add/change updates the same User only after code confirmation. Taken values do not mutate either account. Phone and email replacement remains available; removal and merging are absent. Email values are trimmed and lowercased.
- #322/#496 use production or staging under autotm.bagtyyar.dev and the existing `/:locale/account/delete` route. The prototype has an explicitly mocked web-profile setting; it changes no app environment configuration. Share is absent.
- #352 D10 and #500 supply the email and phone contact screen, available from signed-out Cabinet and Settings. Contact actions use `mailto:bagtyyarkowusow.dev@gmail.com` and `tel:+99363989404`. Hours, response promises and live support chat are absent.
- Identity PRD 30 defers notification preferences; Notifications PRD 36 defers the full category platform. Unsupported category switches were removed. The informational screen describes OS permission and per-conversation mute. Its Android settings action is explicitly a prototype simulation.

The HTML's Conflicts resolved panel links the governing decisions for every removed choice.

## Remaining founder choices

Cabinet A/B layout, inline versus drill-down Settings, direct Change versus a warning sheet, and taken-value recovery with an optional explicit account-switch CTA remain pending. The account-switch CTA explains that it signs out the current session and neither changes nor merges accounts. The proposed deletion checkbox and copy, notification information view and new RU/TK wording also need review. My listings counts and feasibility belong to #354. Recommendation markers are not approval markers.

## Verification

Verified through isolated headless Chrome over a loopback HTTP server with unique `/tmp` profiles, not CUA or a shared browser profile. The final code was exercised across EN/RU/TK, light/dark/system themes and both simulated device theme modes: 1,098 jump/decision renders, 66 keypad/state flows and 8 additional navigation checks. Strict translation lookup throws for a missing key; these renders produced no exceptions. Static literal-key scanning found no dangling translations. JavaScript syntax passed `node --check`, and `git diff --check` passed.

Actual keypad flows covered adding and changing both methods, normalized email, correctly masked phone destination, taken-value refusal and retry, sign-in tabs, return after auth cancellation, deletion failure and success without OTP, explicit recovery and restoration, expired-code refusal then resend, both web profiles and locale routes, and approved support action targets. Additional checks covered tab history and active-tab reset, signed-out Help in both Cabinet layouts, the separate Settings gear in both, the optional taken-value account switch, and either method returning to the same both-methods User after logout.

Local detailed evidence and harness: `/tmp/autotm-353-repair-sol-20261002/evidence.json`, `verify.cjs`, `run.log`, `signin.png`, `support-tk-dark.png`. Screenshots were inspected for phone-tab rendering and support contact legibility in dark theme.

`pnpm test:unit`, `pnpm typecheck` and `pnpm lint` were attempted in the fresh writer worktree and could not run: `turbo: command not found`, with no node_modules installed. Repository-wide gates are missing evidence, not passing checks. Docker remained stopped. This static throwaway repair has no application build, hosted CI or production PR. No real OTP delivery, network reachability, native Android behavior or backend integration was proven. Independent fixed-commit verification and founder review remain outstanding.
