# TDD Decision — Issue #124

## Decision
**No new tests added.** This issue is a pure visual refactoring (design handoff application). All existing tests continue to pass.

## Rationale

Issue #124 applies the merged wizard design handoff to the Expo mobile app. The scope is strictly visual:

1. **Typography**: Adding custom font families (UberMove, UberMoveText, UberMoveMono) and applying them to headings
2. **Spacing**: Adjusting padding, gaps, and margins to match design specs
3. **Colors**: Using existing semantic tokens (`text-foreground`, `text-muted-foreground`, `text-destructive`, etc.)
4. **Component sizing**: Standardizing input heights (52px), button shapes (pill), picker row heights
5. **Layout**: Refactoring auth screens and wizard shell to match HTML design archive

None of these changes alter:
- Business logic or validation rules
- State machine transitions
- API contracts
- Data flow or hook behavior
- Navigation structure

## Existing Test Coverage

The following test suites cover all behavior that could be affected by visual changes:

| Test File | Coverage | Status |
|-----------|----------|--------|
| `wizardMachine.spec.ts` (34 tests) | State machine transitions, validation, cascade invalidation | ✅ Pass |
| `useWizardAutosave.spec.tsx` (7 tests) | Debounced save, retry, network awareness | ✅ Pass |
| `queueState.spec.ts` (25 tests) | Upload queue state transitions | ✅ Pass |
| `compressor.spec.ts` (9 tests) | Image compression logic | ✅ Pass |
| `uploadErrors.spec.ts` (8 tests) | Error categorization | ✅ Pass |
| `client.spec.ts` (7 tests) | API client behavior | ✅ Pass |
| `useRequestOtp.spec.tsx` (2 tests) | OTP request hook | ✅ Pass |
| `useBrands.spec.tsx` (4 tests) | Catalog query hook | ✅ Pass |
| `useUploadQueue.spec.tsx` (3 tests) | Upload queue orchestration | ✅ Pass |
| `vehicleFieldErrorVisibility.spec.ts` (3 tests) | Error display gating | ✅ Pass |

**Total: 102 tests — all passing.**

## Visual Regression Strategy

Since this issue is design-matching, verification is done via:
1. Code review against design archive HTML screens
2. TypeScript compilation (catches prop/type mismatches)
3. Lint (catches style inconsistencies)
4. Unit test suite (catches behavioral regressions)

No screenshot comparison or visual regression testing is in place yet. If visual regression becomes a requirement, it should be added as a separate infrastructure issue.
