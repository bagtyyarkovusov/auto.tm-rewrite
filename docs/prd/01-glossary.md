# 01 — Glossary

Domain language used across PRD, code, and conversation. When introducing a new term, add it here.

## People

| Term | Definition |
|---|---|
| **User** | Any registered account in the system. Has a phone number, optional email, name, avatar. Roles: `user`, `owner`, `admin`. |
| **Private seller / Private buyer** | A User without a Dealership affiliation. The majority. |
| **Dealership** | An organization that lists cars commercially. Has a name, city, logo, optional PRO verification, response-time SLA. |
| **DealershipMember** | A User belonging to a Dealership. Roles: `owner` (full control), `sales` (can manage listings). |
| **Admin** | A User with `role='admin'`. Must have TOTP 2FA enrolled. Operates the admin dashboard. |
| **Inspector** (Phase 2) | A User employed by AutoTM who performs vehicle inspections. |

## Things for sale

| Term | Definition |
|---|---|
| **Listing** | A car ad. Owned by a User. May be `publishedAsDealership` (shows dealership branding + PRO badge). Goes through states: `draft → active → sold | archived | reported | banned`. |
| **ListingMedia** | Photos / videos / orbit-photos attached to a Listing. Photos: max 20. Video: max 1, ≤60s. |
| **Draft** | Saved-but-not-yet-published listing. Auto-restored on next listing-create attempt. |
| **Favorite** | User-saved listing reference. Auth-only. |

## Things the user owns separately

| Term | Definition |
|---|---|
| **Garage** | A User's personal vehicles (`OwnedVehicle`s). NOT for sale. |
| **OwnedVehicle** | One car in the Garage. Has status `owned | dream | sold`. Can be linked to a Listing via "Sell from Garage" shortcut. |
| **Dream car** | A Garage entry with `status=dream` — used as the source for a Saved Search ("Notify when this car is listed"). |

## Discovery + subscriptions

| Term | Definition |
|---|---|
| **SavedSearch** | A user's stored filter criteria. Triggers a notification when a matching Listing is created. |
| **Match** | A Listing that satisfies a SavedSearch's filters at create time. |
| **Saved-search digest** | Notification consolidating multiple matches within an hour (rate-limited delivery). |

## Communication

| Term | Definition |
|---|---|
| **Conversation** | A chat thread scoped to one buyer ↔ seller pair about one Listing. Unique per `(listingId, buyerUserId)`. |
| **Message** | One entry in a Conversation. Type: `text / image / post_ref / system`. |
| **Post-card** (or **post_ref message**) | A Message that embeds a Listing reference, rendered as a clickable card inside chat. |
| **System message** | Server-generated message inside a Conversation (e.g., "Listing marked sold"). |
| **Quick reply** | Pre-defined message snippets ("Is it still available?") shown at the bottom of an empty conversation. |

## Notifications

| Term | Definition |
|---|---|
| **Push** | Native OS notification delivered via FCM (Android) or APNS (iOS). |
| **In-app feed** | Notification list inside the app, regardless of whether a push was sent. |
| **Notification category** | One of: direct messages, saved-search matches, listing activity, admin announcements, blog activity, marketing. |
| **PushPort** | The TS interface abstracting push transport (FCM / APNS / ntfy fallback / test). |

## Content

| Term | Definition |
|---|---|
| **Bortzhurnal** (Бортжурнал) | The blog / personal-journal feature where users post about their cars or ownership experience. |
| **BlogPost** | One Bortzhurnal entry. May be tagged with a Garage car and/or a Brand/Model. |
| **Blog follow** | One User following another's Bortzhurnal — populates a feed (Phase 1.5). |

## Trust (Phase 2)

| Term | Definition |
|---|---|
| **Inspection Report** | A document produced by an AutoTM Inspector evaluating a specific Listing against the rubric. |
| **Rubric** | The structured checklist used by inspectors. Has Sections → Items. Versioned. |
| **Tier** | Computed from total inspection score: `1 = Gold (Trusted)`, `2 = Silver (Inspected)`, `3 = Bronze (Basic)`, `none`. |
| **PDF artifact** | The downloadable inspection report PDF, served from MinIO. |
| **PRO badge** | Displayed on verified Dealerships. Separate concept from tiers — PRO is about the seller, tiers are about the car. |

## Infrastructure

| Term | Definition |
|---|---|
| **Server A** | Primary TM server: API, DB, Redis, MinIO, Caddy, admin, web, worker. |
| **Server B** | Secondary TM server: SMS gateway, observability, replicas, backups. |
| **TM Proxy PC** | A personal computer in TM with legal VPN, acting as: CI runner + outbound proxy + admin manual backup drive. |
| **Phone agent** | The Kotlin Android app running on each of the OTP-dispatch phones. |
| **OTP phone** | A physical Android phone with a TM SIM, USB-tethered to Server B, used to send authentication SMS. |
| **Bundle** | The `.tar.gz` deployment artifact containing Docker images, shipped from build runner to TM servers. |

## Catalog

| Term | Definition |
|---|---|
| **Brand** | Car make (Toyota, BMW, Lada). Trilingual catalog row. |
| **Model** | Within a Brand (Camry, X5, Granta). |
| **Generation** | A specific generation of a Model with year range (BMW X5 IV G05 2018-2023). |
| **BodyType** | Sedan, SUV, Hatchback, etc. |
| **Region** | TM administrative region (Aşgabat, Daşoguz, etc.). |
| **City** | A city within a Region. |

## Currencies + numbers

| Term | Definition |
|---|---|
| **TMT** | Turkmenistan Manat — local currency |
| **USD** | US Dollar |
| **AED** | UAE Dirham — included because TM has trade ties |
| **FX rate** | Admin-edited conversion rate (no live FX API in air-gapped TM) |
