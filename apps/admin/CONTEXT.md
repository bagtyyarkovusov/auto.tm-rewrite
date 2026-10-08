# Admin application

The internal web app provides moderation, content-report review, inspection-interest statistics, audit access, and brand logo management. A top navigation in the authenticated layout links these pages. Broader dashboard capability belongs to the product specification, not this overview.

Browser JavaScript never receives API tokens. Server-side code stores them in HTTP-only cookies and forwards bearer authentication to the API. Preserve production `__Host-` cookie restrictions, origin validation on browser-posted handlers, and local-only `returnTo` validation. The Node `proxy.ts` renews expired requests before rendering or Server Actions, forwarding the rotated cookies to the handler and storing both on the response. Layout/API checks still enforce actual authentication and TOTP elevation. Server Components never rotate tokens or write cookies.

`API_BASE_URL` accepts an http(s) origin or an address ending in `/api/v1`, with an optional trailing slash. Production requires it and validates it at server initialization, before accepting requests. Development retains the public-URL/local fallback. The network regression in `apps/api/src/modules/identity/presentation/AdminApiBridge.spec.ts` uses the real admin client and running API OTP controller; it does not replace `fetch`.

Sign-in creates an ordinary session. Admin access additionally needs TOTP elevation. Pending enrollment reuses the same secret until verification; refresh does not extend the elevation deadline. Logout clears local cookies even if API revocation fails. Keep token and credential values out of logs and errors.

The Brands page (`/catalog/brands`) lists every brand with its logo or a letter fallback and uploads, replaces, or removes a logo through server actions. The browser sends the file to the server action, which checks type and size, asks the API for a presigned PUT, uploads the file to storage from the server, and confirms the key with the API; the API owns the full validation.

Admin must run as exactly **one process and one Railway replica** for the first release (one or two operators), until a shared session store exists; see [ADR-0089](../../docs/adr/0089-single-process-admin-session-renewal-for-the-first-release.md) and [#746](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/746). The process-local renewal owner shares one rotation per SHA-256 hash of the old refresh token. Successful pairs remain only in memory for five seconds, with at most 128 pending or completed entries; token values are never logged. Restarts, a second process, cache overflow or API rejection can lose renewal: both cookies are cleared and the request returns to login with the session-expired message. An expired Server Action renews first and runs once on success; failure cancels it before dispatch, with no automatic replay. API lifetimes, reuse detection and TOTP elevation deadlines remain unchanged.

Tests beside the API client, cookies, validators, and server actions cover these boundaries. `/healthz` remains independent of the API and data stores.

## Start here

- [Server-side API bridge and tests](src/lib/api-client.ts)
- [Cookie storage](src/lib/cookies.ts)
- [Origin and redirect validation](src/lib/validators.ts)
- [Auth actions and tests](src/app/actions.ts)
- [Moderation routes and actions](src/app/(admin))
- [Identity implementation](../api/src/modules/identity/CONTEXT.md)
