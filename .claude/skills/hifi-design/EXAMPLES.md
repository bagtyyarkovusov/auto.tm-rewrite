# Compact hi-fi excerpts

## Microinteraction row

| Interaction | Trigger | Rules | Feedback | Loop/mode | Recovery |
|---|---|---|---|---|---|
| Favorite listing | Tap 48dp heart target | Optimistic toggle; one in-flight request; repeated tap reverses intent | Press state <100ms; heart/state label updates | No hidden mode; state persists per account | Restore prior state and announce retry on failure |

## State row

| State | Surface | Copy/action | Data behavior |
|---|---|---|---|
| Offline | Cached cards + offline banner | “You’re offline” / Retry | Preserve cached results and pending favorite intent |

## Token and component row

| Element | Light | Dark | Component/variant |
|---|---|---|---|
| Primary action | `bg-primary text-primary-foreground` | same semantic names | Existing `Button` primary/default variant |

Resolve the actual names and values from the repository during each run; examples show shape, not timeless constants.
