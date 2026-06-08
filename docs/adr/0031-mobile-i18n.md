# ADR-0031: Mobile i18n runtime — locale store, Accept-Language transport, query-key cache

- **Status**: Accepted
- **Date**: 2026-06-09
- **Deciders**: AutoTM founder + AI architect
- **Relationship**: Implements [ADR-0007](0007-i18n.md) on mobile; **supersedes ADR-0007 §"Catalog data — trilingual columns" client-side rendering**.

## Context

[ADR-0007](0007-i18n.md) set the i18n **strategy** in 2026-05-13: three locales (`ru`/`tk`/`en`), **react-i18next** on mobile + web, default = **device locale → `ru` fallback**, user-generated content stored single-locale and **never force-translated**, trilingual catalog reference data, and `Intl` formatting. Those decisions stand and are **not** re-litigated here.

But ADR-0007 predates the mobile app and the S3 catalog implementation, and left the **mobile runtime wiring unspecified**. Two things must be recorded now that S8 implements full app i18n on mobile:

1. **Shipped catalog localization diverged from ADR-0007.** ADR-0007 sketched the client rendering `name_${locale}` from `name_ru/name_tk/name_en` columns. What **actually shipped in S3** is **server-side selection**: an `Accept-Language` middleware plus a `?locale=` query param the mobile catalog hooks send (`/catalog/brands?locale=ru`), returning a single already-localized field. Meanwhile `apiClient.rawRequest` sends **no** `Accept-Language` header — so the server speaks `Accept-Language` while the client speaks `?locale=`. That split must be reconciled.
2. ADR-0007 never specified locale **state management, persistence, cache invalidation, or resource-file structure** on mobile. Today only `src/auth/copy.ts` (a hand-rolled trilingual map) is localized; the rest of the signed-in app is hardcoded English, and the `queryKeys.catalog.cities` key is the lone catalog key missing a `locale` segment.

## Decision

The mobile i18n **runtime** that implements ADR-0007:

1. **Inherited unchanged from [ADR-0007](0007-i18n.md)** — react-i18next; locales `tk`/`ru`/`en`; fresh-install default = device-detect via `expo-localization` → `ru` fallback; user-generated content (listing title/description, chat messages) shown **verbatim**; number/currency/date via `Intl`.

2. **Locale state** — an app-wide **zustand `localeStore`** (mirroring `src/auth/intentStore.ts`), persisted to **`AsyncStorage`**; react-i18next's active language is bound to it; the hand-rolled `authCopy` map is **subsumed** into react-i18next so there is one system.

3. **Server-locale transport (supersedes ADR-0007 §catalog client-side rendering)** — the **server** selects the localized field; the client transmits locale via an **`Accept-Language` header set from `localeStore` in `apiClient.rawRequest`**, and the per-hook **`?locale=` params are retired**. This formalizes the server-side selection that already shipped in S3 and ends the client/server split.

4. **Cache correctness** — locale **stays a segment in every server-localized TanStack Query key** (a header alone does not invalidate caches, so the key change is what triggers refetch on locale switch). The missing **`cities` key gains its `locale` segment**.

5. **Resource files (refines ADR-0007's flat `{ru,tk,en}.json`)** — **namespaced per feature** (`common`, `auth`, `account`, `listings`, `conversations`, …) rather than one blob per app.

6. **Formatting polyfills** — add `@formatjs/intl-*` polyfills as needed to cover Hermes `Intl` locale-data gaps.

## Consequences

- **+** Single locale source of truth; every future server-localized endpoint gets language **for free** with no param threading.
- **+** Reconciles the ADR-0007-vs-shipped-S3 divergence into one canonical transport (server-side selection via `Accept-Language`).
- **+** Refetch-on-locale-change is largely free — catalog keys already segment by locale.
- **−** Header-based locale has a **cache footgun**: language is not in the URL, so locale **must** stay in query keys or localized caches go stale on switch. Standing rule for every new localized hook.
- **−** One-time verification that the catalog controller honors `Accept-Language` (middleware live since S3) before deleting the `?locale=` params.
- **−** Hermes `Intl` polyfills add bundle size.
- New screens (Profile, Settings, Favorites) are built **i18n-native**; existing screens migrate English → keys in S8a slice A4b. The i18n foundation lands **first** so nothing is built English-then-retrofitted.

## Alternatives

- **Keep `?locale=` query-param transport** — rejected as canonical: leaves the client/server split and re-threads a param into every future localized endpoint (server may still accept it as a secondary input).
- **Client-side trilingual-column rendering** (ADR-0007's original sketch) — **superseded**: S3 already shipped server-side selection; returning one localized field is less payload and a single canonical source.
- **Extend the hand-rolled `authCopy` maps app-wide** — rejected: no pluralization, interpolation, namespacing, or formatting infrastructure; reinvents react-i18next.
- **lingui / react-intl (formatjs)** — not chosen; react-i18next is retained per ADR-0007.
- **Fixed Turkmen-first or Russian-first default** — out of scope here; ADR-0007's device-detect → `ru` stands.

## References

- [ADR-0007](0007-i18n.md) — **parent i18n strategy** (this ADR implements it on mobile and supersedes its catalog client-rendering sketch)
- [ADR-0015](0015-mobile-data-fetching.md) — mobile data fetching (TanStack Query + apiClient)
- [ADR-0017](0017-context7-as-canonical-doc-source.md) — Context7 doc lookups (use for react-i18next / expo-localization)
- [ADR-0027](0027-mlp-beta-scope.md) — MLP beta scope
- `apps/mobile/src/auth/copy.ts`, `src/api/client.ts`, `src/api/queryKeys.ts`
- Sprint S8a, slice **A4** — `docs/prd/sprints/sprint-08-private-beta-polish.md`
