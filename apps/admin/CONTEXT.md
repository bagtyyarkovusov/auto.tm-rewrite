# Admin application

The internal web app provides moderation, content-report review, inspection-interest statistics, audit access, and brand logo management. A top navigation in the authenticated layout links these pages. Broader dashboard capability belongs to the product specification, not this overview.

The browser never receives API tokens. Server-side code stores them in HTTP-only cookies and forwards bearer authentication to the API. Preserve production `__Host-` cookie restrictions, origin validation on browser-posted handlers, and local-only `returnTo` validation. Authenticated layout checks supplement middleware's missing-cookie redirect.

Sign-in creates an ordinary session. Admin access additionally needs TOTP elevation. Pending enrollment reuses the same secret until verification; refresh does not extend the elevation deadline. Logout clears local cookies even if API revocation fails. Keep token and credential values out of logs and errors.

The Brands page (`/catalog/brands`) lists every brand with its logo or a letter fallback and uploads, replaces, or removes a logo through server actions. The browser sends the file to the server action, which checks type and size, then forwards it base64-encoded to the admin catalog API; the API owns the full validation.

Tests beside the API client, cookies, validators, and server actions cover these boundaries. `/healthz` remains independent of the API and data stores.

## Start here

- [Server-side API bridge and tests](src/lib/api-client.ts)
- [Cookie storage](src/lib/cookies.ts)
- [Origin and redirect validation](src/lib/validators.ts)
- [Auth actions and tests](src/app/actions.ts)
- [Moderation routes and actions](src/app/(admin))
- [Identity implementation](../api/src/modules/identity/CONTEXT.md)
