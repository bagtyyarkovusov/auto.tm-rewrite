# Issue #759 phone Sign-in Code verification

Issue: [#759](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/759). Draft PR: [#764](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/764).

Implementer: Codex, provider OpenAI, client Codex CLI, model gpt-6.1-sol, effort high.

## Cause established before production changes

The release report's defect 9 and screenshots [009](release-emulator-pass/009-otp-wrong-code-en-dark.png), [114](release-emulator-pass/114-wrong-code-reduce-motion-on-ru-dark.png) and [120](release-emulator-pass/120-wrong-code-normal-motion-ru-dark.png) show email's wrong-code message versus phone's expired message. These existing device images were inspected from `origin/agent/release-emulator-pass`; no emulator was used for this issue.

`RequestOtp` returns for reserved reviewer/tester phones before creating an OTP row or sending a code. `VerifyOtp.tryReviewerBypass` previously returned null on a wrong fixed code, so `VerifySignInCode` failed to find a request. `AuthController.otpVerify` converted that failure to HTTP 400 `OTP_NOT_FOUND`. The shared `getVerifyCodeErrorCopy` correctly maps that error to expired. Reserved emails do store their fixed code, so mismatches produce `INVALID_OTP`.

This is the fixed tester/reviewer path introduced by PR #713 under [ADR-0086](../adr/0086-temporary-tester-accounts-with-fixed-sign-in-codes.md), not an Android edge-to-edge or React Native error. Its phone no-send/no-issued-row/rate-limit exemption is intentional. Ordinary phone verification already leaves an issued code usable after wrong attempts until expiry or the existing five-attempt limit. The fix changes only the reserved-phone rejection to `Invalid OTP code`, which the existing controller converts to `INVALID_OTP`. Correct fixed codes still sign in without another request.

Confidence: high in the cause and API fix, established by actual controller/use-case tests before and after. Device presentation remains unverified pending the coordinator's second pass. No attempt/request budgets, dependencies, packages, mobile runtime code or native permissions changed.

## Acceptance evidence

Red checkpoint: `a791603dec01411b5a8750d44646f9f00ed886ed`, committed and pushed before production edits. Code checkpoint: `13ccc08a59b852ee813e1328d021c3ddb47e6ac9`.

| Criterion | Evidence | Result |
| --- | --- | --- |
| Establish cause first | Source call chain, ADR-0086/#713, inspected device images and two HTTP-response assertions below | Established; high confidence |
| Wrong phone code shows wrong code; valid code remains usable | Real AuthController + VerifyOtp tester/reviewer mismatch response, followed by correct-code success without resending; rendered phone/email form clears digits, shows wrong-code copy and permits another attempt | API red then green; UI preservation checks pass; device pending |
| Ordinary User code lifetime and limits stay unchanged | New tests: four wrong codes then successful issued code and refusal of reuse; fifth mismatch locks even the correct code; expired wrong and correct codes consume no attempts or Sessions | Green before and after implementation; no ordinary-policy change needed |

The same API command was run red and green:

```sh
pnpm --filter @auto-tm/api exec vitest run src/modules/identity/application/VerifyOtp.spec.ts
```

Red: two intended mismatches, 61 passed. Green: 63 passed. The unchanged ordinary-security and mobile error-mapping tests were already green before the fix; they preserve existing behavior rather than requiring unrelated production changes.

```text
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/modules/identity/application/VerifyOtp.spec.ts > VerifyOtp > reviewer OTP bypass > reports a wrong reviewer phone code and accepts the fixed code without resending
AssertionError: expected BadRequestException: No OTP request found… { …(3) } to match object { …(2) }
(4 matching properties omitted from actual)

- Expected
+ Received

- Object {
+ BadRequestException {
    "response": Object {
-     "code": "INVALID_OTP",
+     "code": "OTP_NOT_FOUND",
    },
    "status": 400,
  }

 ❯ src/modules/identity/application/VerifyOtp.spec.ts:1202:7
    1200|       });
    1201| 
    1202|       await expect(
       |       ^
    1203|         makeAuthController(uc).otpVerify({ phone: account1.phone, code…
    1204|       ).rejects.toMatchObject({

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  src/modules/identity/application/VerifyOtp.spec.ts > VerifyOtp > tester OTP bypass (ADR-0086) > reports a wrong tester phone code and accepts the fixed code without resending
AssertionError: expected BadRequestException: No OTP request found… { …(3) } to match object { …(2) }
(4 matching properties omitted from actual)

- Expected
+ Received

- Object {
+ BadRequestException {
    "response": Object {
-     "code": "INVALID_OTP",
+     "code": "OTP_NOT_FOUND",
    },
    "status": 400,
  }

 ❯ src/modules/identity/application/VerifyOtp.spec.ts:1444:7
    1442|       });
    1443| 
    1444|       await expect(
       |       ^
    1445|         makeAuthController(uc).otpVerify({ phone: tester.phone, code: …
    1446|       ).rejects.toMatchObject({

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  1 failed (1)
      Tests  2 failed | 61 passed (63)
   Start at  14:14:43
   Duration  321ms (transform 83ms, setup 15ms, collect 193ms, tests 18ms, environment 0ms, prepare 24ms)


```

## Local gates

- `pnpm install --frozen-lockfile`: pass. Workspace artifacts built with `pnpm --filter @auto-tm/contracts build` and `DATABASE_URL=postgresql://test:test@localhost:5432/test pnpm --filter @auto-tm/db build`; dummy URL only for generation, no database used.
- `pnpm --filter @auto-tm/api exec vitest run src/modules/identity/application/VerifyOtp.spec.ts src/modules/identity/application/RequestOtp.spec.ts src/modules/identity/infrastructure/ReviewerOtpBypassConfigFactory.spec.ts`: 81 passed across three specs.
- `pnpm --filter @auto-tm/mobile exec vitest run components/auth/CodeEntryForm.spec.tsx components/auth/CodeEntryForm.motion.spec.tsx src/auth/verifyCodeError.spec.ts`: 48 passed. Real OtpCells motion tests cover EN/RU/TK and Reduce Motion; renderer warnings are upstream deprecation notices, not native evidence.
- `pnpm --filter @auto-tm/mobile typecheck` and `pnpm --filter @auto-tm/api typecheck`: pass.
- `pnpm --filter @auto-tm/api exec eslint src/modules/identity/application/VerifyOtp.ts src/modules/identity/application/VerifyOtp.spec.ts` and `pnpm --filter @auto-tm/mobile exec eslint components/auth/CodeEntryForm.spec.tsx`: pass.
- `CI=1 pnpm --filter @auto-tm/mobile exec expo install --check`: pass, dependencies up to date.
- `git diff --check`: pass.

Setup-only failures for unbuilt workspace artifacts and a missing requestAnimationFrame test-host stub were repaired before recording red evidence. Their failures are not counted as acceptance failures. Complete local logs are `/tmp/issue-759-*.log` in the implementing session.

Full local repository tests/typecheck were delegated to hosted `pr` under the founder's machine limits. No native, emulator, simulator or Docker build ran. Mobile export was not run because mobile production code and configuration are unchanged; it would not exercise this API fix. No new device screenshots or live ordinary-number SMS evidence were collected.

## Hosted full gate

The required `pr` check passed on the exact code head `13ccc08a59b852ee813e1328d021c3ddb47e6ac9`: [run 37736808932](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/37736808932). It took the full lane, including lint, repository typecheck, repository tests with disposable services, and admin runtime verification. Complete hosted logs were saved to `/tmp/issue-759-hosted-code.log`; no local Docker/native build was used.

Documentation and the final checkpoint record are pushed separately after that green code head, with each documentation run allowed to complete before the next push.

## Library documentation

Source/package inspection found Nest common 11.1.20 and RN 0.83.10 on Expo SDK 55. Context7 resolved NestJS and queried `/nestjs/nest/v11.1.16`, the nearest returned v11 tag, then `/nestjs/docs.nestjs.com` for exception filters. It confirmed structured HttpException responses and BadRequestException's HTTP 400 mapping, also exercised by the actual installed controller in the tests. No fallback was needed. Identity bypass behavior comes from project source and accepted decisions, not library documentation.

## Device verification pass

Coordinator: use the reserved Android 16 edge-to-edge emulator in the second pass, against the API deployed from the code checkpoint above or its descendant. The server must include the fix; a new mobile binary is not required for it.

1. Russian, dark theme: sign out, choose Phone, use the privately supplied tester phone, request a code and enter a different six-digit value. Expect "Неверный код. Попробуйте еще раз.", cleared enabled cells, and no expired text. Capture with Reduce Motion on, then off, matching screenshots 114/120.
2. Without Resend, enter the correct fixed code and expect sign-in. Repeat with a reviewer phone and with email. Confirm existing EN/TK wrong-code translations. Check light theme for readable error text.
3. Use an ordinary non-reserved staging phone with authorized access to its mock SMS code. Request a code, enter four wrong codes, then the issued code within five minutes without resending. Expect wrong-code messages and successful sign-in.
4. Fresh ordinary request: enter five wrong codes, then the correct one. Expect locked copy and no sign-in. Separate fresh request: wait more than five minutes, then enter the correct code. Expect expired copy and no sign-in.
5. Keep destinations, codes and tokens out of screenshots and logs. Record backend commit and device result on PR #764.

No review was requested, the PR stays draft and auto-merge is disabled as instructed. No independent finalization review or merge was performed. Evidence documentation is the only file outside the assigned auth/identity area.


## Verified execution checkpoint

Recorded after the evidence documentation head `2cda745c0a20c1ac5eebbfb2293a8c291e937420` passed required `pr` [37737574089](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/37737574089) through the docs lane. Its hosted log is `/tmp/issue-759-hosted-docs.log`. The source remains the fully verified code head `13ccc08a59b852ee813e1328d021c3ddb47e6ac9`; no production or test changes followed that full gate.

All code-testable criteria have evidence. Confidence in the reserved-phone response fix and unchanged ordinary OTP security is high. Native/device presentation, real-number delivery, independent finalization review and merge are not claimed. PR #764 is the authoritative mutable Execution state; it stays draft with auto-merge off. Implementer attribution remains Codex, OpenAI, Codex CLI, gpt-6.1-sol, high effort. The coordinator's next action is the second device pass using the steps above.
