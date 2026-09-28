# Mobile application

Mobile is the primary marketplace client. The route tree, API hooks, feature modules, and colocated tests establish current behavior. Use the [Listings overview](src/listings/CONTEXT.md) for create/edit, upload staging, and discovery state.

## Boundaries that matter

- All API calls go through `src/api/client.ts`; it owns single-flight refresh. Hooks use shared contracts and query-key factories. Keep session isolation and cache cleanup when identity changes. Follow the [data-fetching guide](../../docs/agents/mobile-data-fetching.md) before changing this boundary.
- Mobile components use React Native Reusables under `components/ui`. Shared browser components are not native components. Follow the [styling guide](../../docs/agents/nativewind-v4.md); actual tokens, utilities, and fonts are in the app configuration and theme sources.
- Sign-in Methods and listing contact phones have different meanings. Preserve auth-on-action for anonymous browsing, and use the glossary when changing identity/contact flows.
- The locked five-tab navigation and Auto.ru structural discovery reference follow [ADR-0051](../../docs/adr/0051-auto-ru-inspired-mobile-discovery-before-google-play-review.md). Read the affected approved screen specification before UI work. Do not treat an old Kolesa reference as authority for discovery.
- Chat sockets complement HTTP state. Push uses native FCM/APNS tokens; provider setup and device delivery require runtime evidence, not just passing hook tests.

## Native verification

Read [mobile/Expo checks](../../docs/agents/mobile-expo.md) before packages, Metro, navigation, or runtime changes. Keep `.npmrc` hoisting and explicit native dependencies. Expo Go cannot run the full app's push integration; runtime verification uses a development build. Preserve store permission restrictions and bundled native/JS release configuration rather than silently introducing an update channel.

For listing media, preserve client compression and staging safeguards in the local overview. New screens must retain localized copy, accessibility, loading/empty/error states, and theme behavior. Do not copy route inventories or old bug plans into this file.

## Start here

- [Routes and root providers](app)
- [API client and tests](src/api/client.ts)
- [Query keys](src/api/queryKeys.ts)
- [Native configuration and tests](src/config)
- [App configuration](app.config.js)
- [Native UI components](components/ui)
- [Theme utilities](tailwind.config.js)
- [Listing feature boundary](src/listings/CONTEXT.md)
