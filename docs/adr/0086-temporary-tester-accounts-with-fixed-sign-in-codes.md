# ADR-0086: Temporary tester accounts with fixed sign-in codes

- **Status**: Accepted
- **Date**: 2026-10-07
- **Deciders**: AutoTM founder
- **Amends**: [ADR-0030](0030-reviewer-demo-account-otp-bypass.md)'s rule that the fixed-code accounts are "never shared with real beta testers", for a separate tester list only. The reviewer list, its 3 to 5 entries and its scenario seed are unchanged.

## Context

No phone sign-in code reaches a phone today. `SMS_DRIVER=mock` writes the code to the API log, and the gateway path is not built ([ADR-0006](0006-auth.md) waits for real-phone staging). Email codes ([ADR-0055](0055-resend-sends-sign-in-codes-from-the-worker.md)) were also not sent on 2026-10-07: the worker ran with the default `EMAIL_DRIVER=mock`. Many testers in Turkmenistan have no inbox they read, or cannot receive mail from Resend.

The founder wants 30 testers on production for a test round, and their accounts removed once the test passes.

## Decision

- **A separate tester list.** The API reads an optional `TESTER_ACCOUNTS_JSON`, a JSON array of 0 to 30 `{ phone, email, code }` entries, validated at boot with the reviewer list's rules. Phones and emails are unique within the list and never repeat a reviewer account.
- **Same sign-in as a reviewer.** A tester entry signs in with its fixed 6-digit code through the same constant-time match, phone rate-limit exemption, no-send rule and audit record as a reviewer entry. Tester entries do not depend on `REVIEW_DEMO_ACCOUNT_ENABLED`; an empty or unset list turns them off.
- **Ordinary accounts.** A tester has buyer and seller rights only, never moderator or admin.
- **Secrets stay out of git and logs.** Phones and codes live in the operator secret store and are handed to each tester privately, one entry per tester.
- **Temporary.** After the test, the operator runs the tester removal script. It schedules each tester User for deletion now and ends their Sessions, so the existing account purge removes them and their data. Then the operator sets `TESTER_ACCOUNTS_JSON` to `[]`. The founder decides when the test has passed.

## Consequences

- Testers can sign in although no SMS gateway exists.
- Anyone who learns a tester's phone and code can sign in as that tester until removal. The accounts hold only test data, and every sign-in is audited.
- Thirty more fixed codes sit beside the reviewer codes in the API environment.

## Alternatives considered

- **Add testers to `REVIEW_DEMO_ACCOUNTS_JSON`.** Rejected: that list is capped at 5 and the reviewer scenario seed binds to it.
- **Read codes from the API log and relay them to testers.** Rejected: one operator per sign-in, for 30 people.
- **Wait for the SMS gateway.** Rejected: not ready for this test round.
- **Email codes only.** Kept as a second path, but not enough on its own for testers without a usable inbox.

## References

- [Issue #712](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/712)
- [ADR-0030](0030-reviewer-demo-account-otp-bypass.md), [ADR-0054](0054-phone-or-email-sign-in-share-one-user.md), [ADR-0055](0055-resend-sends-sign-in-codes-from-the-worker.md)
