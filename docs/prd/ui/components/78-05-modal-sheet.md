# 78-05 — Modal / Sheet

## Purpose

Surface that overlays the current screen to focus the user's attention on a single task. Two flavors: **Modal** (centered, desktop-favored) and **Sheet** (bottom-anchored, mobile-favored).

## When to use

- Confirming a destructive action ("Delete listing?")
- Picking a date / region (small form)
- Sign-in prompt (action-gated auth)
- Filter sheet (a sheet, not a modal)
- Quick share menu

## When NOT to use

- Full-screen flows — use a route + navigation push
- Long forms (5+ fields) — use a dedicated screen
- Notifications / toasts — use Toast component
- Static info displays — use inline UI

## Variants

### Modal (web-favored)

| Variant | Use |
|---|---|
| `dialog` | Default; centered, max-width 480px |
| `confirmation` | Small; OK + Cancel buttons |
| `form` | Wider (640px); contains a form |

Layout:
```
              ┌─────────────────┐
              │  Header     [X] │
              ├─────────────────┤
              │                 │
              │   Body          │
              │                 │
              ├─────────────────┤
              │   Cancel  OK    │
              └─────────────────┘
   <-- backdrop scrim, dismisses on click -->
```

### Sheet (mobile-favored)

| Variant | Use |
|---|---|
| `bottom-sheet` | Default; slides up from bottom; can be dragged |
| `action-sheet` | iOS-style action menu (Cancel + actions) |
| `full-screen` | Edge-to-edge sheet for complex flows |

Layout:
```
              [drag handle]
              Header
              ──────
              Body
              ...
              Cancel
            ─────────────────────
```

## When to pick which

- **Confirming a destructive action**: Modal on web, Sheet on mobile
- **Filter sheet**: Sheet on both (mobile-style)
- **Selecting from a list**: Sheet on both
- **Sign-in prompt**: Sheet on both
- **Quick edit form**: Modal on web (640px); full-screen Sheet on mobile

## States

| State | Behavior |
|---|---|
| Opening | Slide / fade in, `slow` (400ms), `decel` easing |
| Open | Focus trapped inside; Esc / back closes; scrim catches outside taps |
| Closing | Slide / fade out, `slow`, `accel` easing |
| Dismissed | Returns focus to the element that opened it |

## Sheet drag behavior (mobile)

- Drag handle at top (small horizontal line)
- Drag down to dismiss (past 30% threshold → closes)
- Velocity-based: fast flick down → dismisses
- During drag: backdrop opacity reduces with sheet position

## Accessibility

- `role="dialog"` (web) / `accessibilityViewIsModal` (RN)
- `aria-labelledby` pointing to title; `aria-describedby` for body
- Focus trapped inside until dismissed
- Esc key dismisses (web); back gesture dismisses (mobile)
- Screen reader announces "Dialog opened: [title]"

## Implementation (web)

Using shadcn/ui `Dialog` for Modal, `Sheet` for Sheet:

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent variant="confirmation">
    <DialogHeader>
      <DialogTitle>Delete this listing?</DialogTitle>
      <DialogDescription>This cannot be undone.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button intent="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      <Button intent="destructive" onClick={handleDelete}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Implementation (mobile)

Using `@gorhom/bottom-sheet`:

```tsx
<BottomSheet
  ref={sheetRef}
  snapPoints={['50%', '90%']}
  enablePanDownToClose
>
  <BottomSheetView>
    <SheetHeader title="Delete this listing?" />
    <SheetBody>
      <Text>This cannot be undone.</Text>
    </SheetBody>
    <SheetFooter>
      <Button intent="secondary" onPress={() => sheetRef.current?.close()}>Cancel</Button>
      <Button intent="destructive" onPress={handleDelete}>Delete</Button>
    </SheetFooter>
  </BottomSheetView>
</BottomSheet>
```

## Don'ts

- ❌ Nested modals (modal opening another modal) — flatten the flow
- ❌ Modals without a clear close affordance (always have X + scrim dismiss + Esc)
- ❌ Modal forms with > 7 fields — use a dedicated screen
- ❌ Auto-dismiss after timeout (user must explicitly choose)
- ❌ Modals on top of toasts — toasts always dismiss first
