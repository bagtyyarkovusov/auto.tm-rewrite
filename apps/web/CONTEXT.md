# Public web

The public site provides a localized landing page, legal pages, trust information, and the public account deletion page. At this branch's implementation, listing/dealer/blog routes and SSR marketplace data fetching are absent. Use the route tree to establish shipped pages; roadmap descriptions do not establish implementation.

`/healthz` is dependency-free and bypasses locale routing. The standalone production image uses Next.js output tracing at the monorepo root. Preserve deployment identity in health responses.

The account deletion page, `/[locale]/account/delete`, is Google Play's deletion link; the bare `/account/delete` redirects to a locale. The API has no CORS, so the browser never calls it directly: the form calls Server Functions, which call the public `account-deletion` endpoints through `src/lib/account-deletion.ts` with the shared contract schemas. Every message after a request must stay true whether or not a User holds the value, so the page reveals no more than the API. Server-side API calls use `API_BASE_URL`, then `NEXT_PUBLIC_API_URL`, the same order as admin. The API's per-IP Sign-in Code budget sees the visitor IP that web forwards: `X-Real-IP` first, which Railway's edge sets, then `X-Forwarded-For`. Any other ingress must set or overwrite `X-Real-IP`, or visitors can choose their own budget.

Web shares browser components and theme tokens with `packages/ui`; mobile has separate native components. User-facing text must remain available in the supported locales.

## Start here

- [Pages and route handlers](src/app)
- [Locale routing](src/middleware.ts)
- [Build configuration](next.config.ts)
- [Production image](../../infra/docker/web.Dockerfile)
- [Account deletion page](src/app/[locale]/account/delete)
- [Shared UI](../../packages/ui/CONTEXT.md)
