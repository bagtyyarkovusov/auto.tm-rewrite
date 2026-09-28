# Public web

The public site provides a localized landing page, legal pages, and trust information. At this branch's implementation, listing/dealer/blog routes and SSR marketplace data fetching are absent. Use the route tree to establish shipped pages; roadmap descriptions do not establish implementation.

`/healthz` is dependency-free and bypasses locale routing. The standalone production image uses Next.js output tracing at the monorepo root. Preserve deployment identity in health responses.

Web shares browser components and theme tokens with `packages/ui`; mobile has separate native components. User-facing text must remain available in the supported locales.

## Start here

- [Pages and route handlers](src/app)
- [Locale routing](src/middleware.ts)
- [Build configuration](next.config.ts)
- [Production image](../../infra/docker/web.Dockerfile)
- [Shared UI](../../packages/ui/CONTEXT.md)
