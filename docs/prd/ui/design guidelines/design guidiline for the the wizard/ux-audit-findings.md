# UX Heuristic Audit — OTP Flow + Create Listing Wizard

> Method: Nielsen's 10 Usability Heuristics + Krug's Three Laws + Lean UX assumption validation.
> Date: 2026-05-19

---

## OTP Flow

### Catastrophic (Severity 4)

| # | Issue | Heuristic | Fix |
|---|-------|-----------|-----|
| 1 | **Close button is broken.** `closeAuth()` posts `action: 'close'`; wrapper only handles `navigate`. Nothing happens on tap. | #3 User Control | Add `close` handler to wrapper; add fallback `navigate` in screen |

### Major (Severity 3)

| # | Issue | Heuristic | Fix |
|---|-------|-----------|-----|
| 2 | **No loading state on "Get code" CTA.** User taps, gets zero feedback for ~1-2s. Feels broken. | #1 Visibility of Status | Add spinner + disabled state to CTA |
| 3 | **Paste with +993 prefix breaks input.** User copies "+99361234567" from contacts; paste includes prefix, formatter chokes. | #5 Error Prevention | Strip +993 prefix on paste; handle full-number paste |
| 4 | **OTP shows only one generic error.** PRD specifies 6 distinct errors (wrong, expired, locked, used, rate-limited, generic). Users can't tell what to do. | #9 Error Recovery | Map URL params to specific error copy per PRD |
| 5 | **Phone screen helper turns red on any invalid input** — aggressive error color while user is still typing. Creates anxiety. | #5 Error Prevention | Only show error red on blur or after 8 digits attempted |

### Minor (Severity 2)

| # | Issue | Heuristic | Fix |
|---|-------|-----------|-----|
| 6 | **Wrapper font paths are hashed** (`mpcixtgf-...`) and don't resolve. Wrapper chrome falls back to system fonts. | #4 Consistency | Point to real font files |
| 7 | **Three identical OTP wrapper files** (`otp-flow-uber`, `-2`, `-3`). No variation = maintenance debt. | Lean UX waste | Consolidate to one canonical wrapper |
| 8 | **OTP cells still show `cursor:text` when input is disabled during loading.** Misleading affordance. | #1 Visibility of Status | Disable cell click during loading |
| 9 | **No "Having trouble?" or support escape hatch** on OTP. PRD says defer, but prototype should at least reserve space. | #10 Help | Out of scope per PRD; noted |

---

## Create Listing Wizard

### Major (Severity 3)

| # | Issue | Heuristic | Fix |
|---|-------|-----------|-----|
| 10 | **Overflow "..." skips menu and jumps straight to Discard dialog.** PRD specifies DropdownMenu → "Discard draft". Current flow is jarring and error-prone. | #5 Error Prevention | Add overflow menu sheet with "Discard draft" option |
| 11 | **Review screen has no "Description" review row.** PRD Step 7 includes description; Review should surface it. | #4 Consistency | Add Description row to review card |
| 12 | **Continue buttons are always enabled** even when required fields are empty. Gives false confidence. | #5 Error Prevention | Wire Continue disabled state to required-field validation demo |
| 13 | **No inline field errors demonstrated.** PRD closure note says field errors render inline under each input via `fieldErrors` map. Current screens show no error demos. | #9 Error Recovery | Add error-state demo params to key fields |

### Minor (Severity 2)

| # | Issue | Heuristic | Fix |
|---|-------|-----------|-----|
| 14 | **Save status is hardcoded "Saved"** on most steps. No "Saving..." or "Could not save - Retry" demos. | #1 Visibility of Status | Add dynamic save status with demo states |
| 15 | **No edit mode title variation.** Header always says "Sell car"; PRD says "Edit listing" in edit mode. | #4 Consistency | Add `?mode=edit` param demo |
| 16 | **Discard dialog has no loading or error state.** Destructive action needs feedback. | #1 Visibility of Status | Add spinner on Discard; keep open on error |
| 17 | **Step 4 (Specs) missing from navigation** in wrapper? Actually `04-specs.html` exists. OK. |
| 18 | **No keyboard scroll padding** on forms. On real mobile, keyboard covers inputs. | #7 Flexibility | Add `scroll-padding-bottom` and focus scroll behavior |
| 19 | **VIN input has no `maxlength`.** VIN is 17 chars. | #5 Error Prevention | Add `maxlength="17"` |
| 20 | **Photo grid action buttons (Camera/Library) have no visual feedback on tap** — no `:active` transform. | #1 Visibility of Status | Add press feedback |

---

## Scores

| Flow | Score | Target |
|------|-------|--------|
| OTP Flow (before) | 5/10 | 9/10 |
| Wizard (before) | 6/10 | 9/10 |

---

## Lean UX Assumptions Tested

1. **Assumption**: Users understand the +993 prefix is locked. **Finding**: Paste from contacts breaks it — assumption is partially false.
2. **Assumption**: One generic "Wrong code" error is sufficient for prototype. **Finding**: PRD specifies 6 error types; generic copy blocks recovery — assumption false.
3. **Assumption**: Overflow → Discard directly is faster. **Finding**: Violates error prevention; users accidentally lose drafts — assumption false.
4. **Assumption**: Static "Saved" status is enough for demo. **Finding**: Doesn't demonstrate the full state machine engineers need to build — assumption false.
