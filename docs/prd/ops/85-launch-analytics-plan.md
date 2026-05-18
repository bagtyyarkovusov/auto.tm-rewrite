# 85 - Launch analytics and scaling plan

## Summary

This is the operating plan for AutoTM's first MVP launch: what must be ready before launch, what analytics we collect, what the admin dashboard shows, how we act on the data, and when we scale from beta to public soft launch to broader growth.

The plan is intentionally practical. It is not a marketing wish list and not a generic analytics spec. It answers:

- Are we ready to launch?
- Is the marketplace working after launch?
- Which city needs more supply or more demand?
- Which reliability issue blocks growth?
- Which Phase 2 bets are justified by real launch data?

## Locked decisions

These decisions are treated as the default unless a future ADR or PRD revision supersedes them:

1. **First launch means controlled public soft launch after S10.** App stores are public, but growth is staged and monitored. No full-market paid push on day one.
2. **North-star launch metric is qualified buyer-seller connections per active listing.** Downloads and DAU matter, but the marketplace works only if buyers contact sellers.
3. **MVP analytics are first-party only.** No PostHog, Mixpanel, Google Analytics, Firebase Analytics, session replay, ad identifiers, or third-party analytics SDKs in MVP.
4. **Analytics measure product health, not surveillance.** No raw GPS, background location, contact-book scraping, keystroke tracking, exact home-address tracking, or hidden paid ranking.
5. **Location analytics are city-level.** Store catalog `regionId` / `cityId` and listing city. If future "Use my location" resolves GPS to a nearest catalog City, store the resolved City ID and source action, not the coordinate.
6. **Admin analytics are operational.** The dashboard tells admins what to fix today: reliability, supply, demand, trust, seller responsiveness, and city gaps.
7. **Growth is stage-gated.** Increase marketing only after OTP, uploads, listing creation, contact actions, and moderation are stable.
8. **Launch plan separates blocking MVP work from later work.** A metric can be important without blocking first launch.

## Canonical terms

| Term | Meaning |
|---|---|
| **Active listing** | Public listing visible in browse/search. Excludes drafts, archived, banned, and deleted listings. |
| **Qualified connection** | A buyer-intent action from listing detail: `chat_started` or `call_tapped`. |
| **Connection rate** | Qualified connections divided by active listings for the same period. Also viewable by city. |
| **Supply** | Active listings, new listings, verified dealers, and publish success. |
| **Demand** | Searches, listing views, saved searches, favorites, chat starts, call taps. |
| **Liquidity** | Whether supply and demand produce buyer-seller contact. |
| **Reliability** | OTP, uploads, API, push, chat, and background jobs working at launch quality. |
| **City gap** | Demand and supply are mismatched for a city. Example: many searches for Mary, few Mary listings. |
| **Raw product event** | Append-only event row from API/mobile/web, retained short term. |
| **Aggregate metric** | Daily/hourly precomputed metric used by admin dashboard and reviews. |

## Scope boundaries

### MVP launch-blocking

These must be ready before public soft launch:

- First-party event ingestion path for launch-critical events.
- Admin dashboard cards for marketplace health, reliability, and moderation.
- Daily aggregate metrics for the launch scorecard.
- Launch gates and rollback flags.
- Privacy/legal text matching actual data collection.
- A repeatable launch review cadence.

### MVP important but not launch-blocking

These should be added during S9/S10 if cheap, or immediately after launch if needed:

- CSV export for analytics tables.
- More detailed city drilldowns.
- Seller response-time distribution by city/dealer.
- Zero-result search review queue for catalog cleanup.
- Simple feedback form linked from Settings or support.

### Phase 1.5 / Phase 2

These are explicitly later:

- BI warehouse or external dashboarding.
- Cohort retention analysis beyond simple DAU/WAU.
- Dealer monthly email reports.
- Inspection-program analytics.
- Ad campaign reporting.
- A/B testing framework.
- Radius search, map search, or exact GPS analytics.
- ML ranking or personalization analytics beyond agreed first-party events.

## Launch shape

### First launch definition

First launch is **controlled public soft launch**:

- App is installable from Google Play and App Store.
- Public web is live.
- Real users can browse, create listings, favorite, save searches, and contact sellers.
- Marketing is intentionally limited.
- Founder/team watch metrics daily.
- The goal is learning plus operational safety, not maximum traffic.

### Why not full national launch immediately

AutoTM is a two-sided marketplace. Full demand before supply creates disappointment. Full seller onboarding before reliability creates support load. The first launch must prove:

- buyers can find enough real listings;
- sellers can publish without friction;
- OTP and uploads survive real users;
- moderation can keep up;
- city-level supply/demand data tells us where to push next.

## MVP feature boundary

### Must be present at launch

- Anonymous browse.
- Catalog-backed listing creation.
- Photo upload and listing media display.
- Price/currency handling.
- City-first listing location.
- Listing detail.
- Favorites.
- Saved searches.
- OTP login.
- Chat or call/contact flow, depending on final S7 scope.
- Notifications for saved-search/chat basics.
- Dealer profiles and verified dealer badge.
- Admin moderation.
- Admin catalog tools.
- Admin metrics dashboard.
- Legal/account deletion/store readiness.
- Monitoring, alerts, rollback, and support channels.

### Explicitly not required for launch

- Map/radius search.
- Exact listing GPS.
- Inspections.
- Paid ads.
- Paid listing boosts.
- Advanced personalization.
- Public API.
- Full dealer subscription billing automation.
- ML ranking.
- Comparison tool.
- Heavy analytics BI tooling.
- Session replay.

## Launch gates

Public soft launch is blocked unless all critical gates are green.

### Engineering gates

| Gate | Requirement | Blocking? |
|---|---|---|
| Phase 1 scope | S1-S10 scope complete or explicitly deferred in sprint/retro docs | Yes |
| E2E tests | Critical happy paths pass | Yes |
| Production deploy | At least one successful production deploy | Yes |
| Rollback | Rollback command/process tested | Yes |
| Backup/restore | Full restore drill from staging/prod-like backup | Yes |
| Feature flags | Signups, listing publish, chat/contact, broadcast can be paused | Yes |
| Store builds | Android/iOS approved or on ready public testing track | Yes |
| Legal URLs | Privacy/Terms live in RU/TK/EN | Yes |

### Reliability gates

| Gate | Target | Blocking? |
|---|---|---|
| OTP success | >= 95% in beta | Yes |
| Image upload success | >= 95% in beta | Yes |
| API stability | No unresolved P0/P1 bugs | Yes |
| Push delivery | Verified on real Android and iOS devices | Yes |
| SMS gateway | 5 phones provisioned, spare phone ready | Yes |
| Alerts | Telegram alert drill passed | Yes |

### Marketplace gates

| Gate | Target | Blocking? |
|---|---|---|
| Seed listings | 10-20 real-looking listings | Yes |
| Verified dealers | At least 2 | Yes |
| Catalog | Common launch-market cars covered | Yes |
| Moderation | Admin can review reports and ban/hide listings | Yes |
| Support | Support phone/email or Telegram process ready | Yes |

### Analytics gates

| Gate | Target | Blocking? |
|---|---|---|
| Core events | OTP, listing, search, favorite, contact, upload, report events ingest | Yes |
| Daily aggregates | Scorecard metrics roll up | Yes |
| Dashboard | Admin can view launch scorecard | Yes |
| Privacy check | No raw GPS, ad IDs, session replay, or third-party analytics SDKs | Yes |
| Data retention | Raw/aggregate retention policy documented | Yes |

## Analytics architecture

### Decision

MVP uses a custom first-party analytics system.

The product emits marketplace events to AutoTM's own API. The API validates and stores raw events in an append-only table or log. A scheduled worker rolls events into daily/hourly aggregates for admin dashboards and reviews.

### Why this shape

- Works with TM-local hosting and privacy constraints.
- Avoids third-party SDK/legal drift.
- Captures marketplace-specific semantics that generic tools do not understand.
- Keeps admin dashboard fast through aggregates.
- Leaves a future export path to BI without giving external tools raw user behavior.

### High-level data flow

```text
mobile/web/admin
  -> API analytics endpoint
  -> AnalyticsEvent append-only storage
  -> worker aggregate job
  -> AnalyticsDailyMetric / dashboard read models
  -> admin dashboard + launch review
```

### Raw event principles

- Append-only.
- Server timestamp always recorded.
- Client timestamp optional and treated as advisory.
- User ID optional because anonymous browse is allowed.
- Session ID can be ephemeral and resettable.
- Never store raw GPS.
- Never store exact private address.
- Never store full phone numbers in analytics payloads.
- Prefer IDs over strings where possible: `listingId`, `cityId`, `brandId`, `modelId`.

### Suggested storage model

This is a planning shape, not a committed Prisma schema:

```text
AnalyticsEvent
- id
- eventName
- actorUserId?
- anonymousSessionId?
- occurredAt
- receivedAt
- source: mobile | web | admin | api | worker
- appVersion?
- platform?
- locale?
- regionId?
- cityId?
- listingId?
- dealershipId?
- payloadJson
```

```text
AnalyticsDailyMetric
- id
- date
- metricName
- dimensionsJson
- value
- calculatedAt
```

### Retention

| Data | Retention | Reason |
|---|---|---|
| Raw analytics events | 90-180 days | Enough for launch debugging and short-term funnel analysis |
| Daily aggregates | 2+ years | Long-term planning and trend analysis |
| Error traces/logs | Per observability runbook | Operational debugging |
| Audit logs | Long-term | Admin/legal accountability |
| Raw GPS | Not collected in MVP | Privacy and ADR-0022 |

## Event taxonomy

### Naming rules

- Event names use snake_case.
- Events describe completed facts, not intentions.
- Prefer domain nouns: listing, search, saved_search, conversation, notification.
- Do not include PII in event names or payload fields.
- Add new events deliberately; every event should answer an operating question.

### Identity and session events

| Event | When recorded | Key dimensions | Used for |
|---|---|---|---|
| `app_opened` | App foregrounds or web session begins | source, platform, appVersion, locale | DAU/WAU |
| `otp_requested` | User requests OTP | source, phoneCountry?, rateLimitStatus | OTP funnel |
| `otp_verified` | OTP accepted | source, userId | Auth success |
| `otp_failed` | OTP rejected or expired | reason bucket | Reliability/fraud |
| `logout_completed` | User logs out | source | Session health |
| `account_delete_requested` | User starts delete flow | source | Legal/admin |

### Listing creation events

| Event | When recorded | Key dimensions | Used for |
|---|---|---|---|
| `listing_draft_started` | Seller starts wizard | source, userId | Publish funnel |
| `listing_step_completed` | Wizard step completed | stepName | Dropoff |
| `listing_media_uploaded` | Photo/video upload succeeds | mediaType, sizeBucket | Upload reliability |
| `listing_media_upload_failed` | Upload fails | reason bucket, mediaType | Launch reliability |
| `listing_publish_attempted` | Seller taps publish | cityId, brandId, modelId | Funnel |
| `listing_published` | Listing becomes active | cityId, brandId, modelId, sellerType | Supply |
| `listing_publish_failed` | Publish fails | reason bucket | Funnel reliability |
| `listing_edited` | Active listing edited | fieldFamily | Seller behavior |
| `listing_price_changed` | Price changes | currency, changeDirection | Pricing behavior |
| `listing_marked_sold` | Seller marks sold | cityId, brandId, modelId | Liquidity |
| `seller_sold_confirmed_autotm_buyer` | Seller answers "buyer from AutoTM?" yes/no | answer | Attribution |

### Discovery events

| Event | When recorded | Key dimensions | Used for |
|---|---|---|---|
| `feed_loaded` | Feed returns listings | cityId?, resultCountBucket | Demand |
| `listing_viewed` | Listing detail opened | listingId, cityId, brandId, modelId | Demand |
| `search_submitted` | Text search submitted | resultCountBucket, cityId? | Demand/catalog gaps |
| `filter_applied` | Filter sheet applied | filterFamilies, cityId?, resultCountBucket | Filter behavior |
| `zero_result_search` | Search/filter returns zero | filterFamilies, cityId? | Catalog/supply gaps |
| `saved_search_created` | User saves search | cityId?, brandId?, modelId? | Demand |
| `favorite_added` | Listing favorited | listingId, cityId | Buyer intent |
| `favorite_removed` | Listing unfavorited | listingId, cityId | Buyer intent |

### Contact events

| Event | When recorded | Key dimensions | Used for |
|---|---|---|---|
| `call_tapped` | Buyer taps call | listingId, cityId, sellerType | Qualified connection |
| `chat_started` | Conversation created from listing | listingId, cityId, sellerType | Qualified connection |
| `message_sent` | Message sent | conversationId, senderRole | Chat health |
| `seller_first_response_sent` | Seller replies first time | responseTimeBucket | Seller quality |
| `conversation_reported` | User reports conversation | reason | Trust |

### Notification events

| Event | When recorded | Key dimensions | Used for |
|---|---|---|---|
| `push_token_registered` | Device token saved | platform | Push reach |
| `push_sent` | Worker sends push | category | Delivery funnel |
| `push_delivery_failed` | FCM/APNS rejects send | reason bucket | Reliability |
| `push_opened` | User opens push | category, deepLinkType | Notification value |
| `saved_search_match_created` | Worker finds a match | savedSearchId, cityId | Match quality |

### Moderation and trust events

| Event | When recorded | Key dimensions | Used for |
|---|---|---|---|
| `report_submitted` | User submits report | targetType, reason | Trust |
| `admin_action_recorded` | Admin action writes audit log | actionType, targetType | Governance |
| `listing_banned` | Listing removed by admin | reason | Trust |
| `user_suspended` | User suspended | reason | Trust |
| `dealership_verified` | Dealer verified | cityId | Dealer supply |

### Banned MVP analytics

Do not collect:

- raw GPS coordinates;
- background location;
- advertising identifiers;
- contact book data;
- keystrokes;
- session replay;
- screen recordings;
- exact private home addresses;
- hidden paid-ranking signals;
- third-party tracker cookies;
- full phone numbers in analytics payloads.

## Admin dashboard

The MVP dashboard should be operational, dense, and decision-oriented.

### Section 1: Marketplace health

| Metric | Definition | Action |
|---|---|---|
| DAU / WAU | Unique active users | Demand trend |
| Active listings | Visible listings | Supply baseline |
| New listings today / 7 days | Published listings | Seller activation |
| Qualified connections | `call_tapped + chat_started` | Liquidity |
| Connections per active listing | Qualified connections / active listings | North-star launch health |

### Section 2: City supply / demand

| Metric | Definition | Action |
|---|---|---|
| Active listings by city | Current supply | Recruit sellers where low |
| Searches by city | Demand signal | Seed supply where high |
| Saved searches by city | Strong demand | Dealer outreach |
| Favorite/chat/call starts by listing city | Conversion by city | Improve city quality |
| Zero-result searches by city | Unmet demand | Catalog/supply cleanup |

### Section 3: Funnel

| Funnel | Steps | Action |
|---|---|---|
| Auth | OTP requested -> verified | Fix SMS/rate limits |
| Listing publish | draft started -> publish attempted -> published | Fix wizard/uploads |
| Buyer intent | listing viewed -> favorite -> call/chat | Fix listing detail/contact UX |
| Saved search | filter applied -> saved search created -> push opened | Fix matching/notifications |

### Section 4: Reliability

| Metric | Target | Action |
|---|---|---|
| OTP success | >= 95% | Stop growth if below target |
| Upload success | >= 95% | Fix media pipeline |
| API error rate | < 2% sustained | Investigate/rollback |
| Push delivery | >= 90% initially | Fix tokens/provider |
| SMS phone health | 5/5 preferred, 4/5 acceptable short term | Repair phone fleet |

### Section 5: Moderation and trust

| Metric | Target | Action |
|---|---|---|
| Pending reports | Cleared daily | Add moderation time |
| Report rate | Watch spikes | Tighten abuse controls |
| Banned listings | Review patterns | Improve listing validation |
| Suspended users | Review patterns | Improve fraud controls |
| Average moderation response time | Same day in launch week | Protect trust |

### Section 6: Dealer

| Metric | Definition | Action |
|---|---|---|
| Active dealers | Dealers with active listings | Dealer supply |
| Verified dealers | Dealers with PRO badge | Trust/supply |
| Dealer listings | Active listings from dealers | Inventory growth |
| Dealer response time | First response bucket | Dealer quality |
| Dealer lead count | Call/chat starts on dealer listings | Dealer ROI |

## Operating cadence

### Launch day

- Monitor every 30 minutes.
- Watch reliability first: OTP, uploads, API, SMS, push.
- Watch support and moderation queue.
- Do not optimize growth on day one.
- Write end-of-day launch note: what broke, what worked, what changes tomorrow.

### Week 1

- Daily launch review at the same time.
- Compare the same scorecard each day.
- Assign one owner for each red metric.
- Keep fixes small and safe.
- Do not add major new features.

### Weeks 2-4

- Review 3 times per week.
- Start separating reliability problems from product conversion problems.
- Decide whether growth can increase city by city.
- Write the Phase 1 launch retro at the end of week 2 or week 4.

### Month 2-3

- Weekly growth/ops review.
- Use city supply/demand to guide outreach.
- Start Phase 1.5 or Phase 2 planning from data.
- Re-evaluate success metrics and revenue assumptions.

### After month 3

- Monthly strategy review.
- Continue weekly ops review if reliability or moderation remains unstable.
- Decide whether to broaden growth, build inspection program, or deepen dealer tools.

## Decision rules

### Reliability rules

| Signal | Threshold | Action |
|---|---|---|
| OTP success | < 95% for > 24h | Pause growth, fix SMS gateway/rate limits |
| Upload success | < 95% for > 24h | Pause seller push, fix media pipeline |
| API error rate | > 2% sustained | Investigate; rollback if deploy-related |
| Push failure | > 10% for 15 min | Fix provider/token handling |
| SMS phones | 2+ phones offline | Stop broadcast/growth, repair phone fleet |

### Marketplace rules

| Signal | Threshold | Action |
|---|---|---|
| Active listings | < 30 after launch month | Direct seller/dealer outreach |
| Connection rate | Near zero despite listing views | Fix listing detail/contact UX |
| Zero-result searches | > 30% of searches | Seed supply/catalog in demanded areas |
| Seller response | Consistently slow | Nudge sellers; prioritize dealer quality |
| Publish funnel | High draft dropoff | Fix wizard, catalog picker, uploads |

### City rules

| Pattern | Meaning | Action |
|---|---|---|
| High demand, low supply | Users want cars there | Recruit dealers/sellers, seed listings |
| High supply, low demand | Listings exist but buyers absent | Local content/community push |
| High views, low contacts | Listing quality/contact UX problem | Improve detail page, seller prompts |
| High reports by city | Trust/supply quality issue | Increase moderation and verification |
| Many zero-result brand/model searches | Catalog or supply gap | Seed catalog and recruit listings |

### Trust rules

| Signal | Threshold | Action |
|---|---|---|
| Reports pending | Cannot clear daily | Add moderation time |
| Scam reports | Spike by seller/city | Suspend faster, add validation |
| Dealer complaints | Repeated | Review verification and dealer status |
| Account deletion requests | Spike after launch change | Review UX/privacy issue |

## Growth stages

### Stage 0: Internal readiness

Audience:

- Team only.
- A few trusted test accounts.

Goal:

- Production works.
- Alerts work.
- Rollback works.
- Admin tools work.

Exit:

- Launch gates green.

### Stage 1: Beta cohort

Audience:

- 10-30 invited users.
- Sympathetic dealers.
- Friends/family who will report bugs clearly.

Goal:

- Catch bugs.
- Validate OTP/upload/chat/push on real devices.
- Verify listing creation and moderation.

Exit:

- No unresolved P0/P1.
- OTP/upload >= 95%.
- Admin can clear reports daily.

### Stage 2: Controlled public soft launch

Audience:

- App stores public.
- Founder network.
- Limited Telegram/Instagram announcement.
- Early dealer outreach.

Goal:

- Prove liquidity and reliability.
- Learn city supply/demand.
- Observe real seller behavior.

Exit:

- Week-1 reliability stable.
- Connections per active listing non-zero and improving.
- Support/moderation manageable.

### Stage 3: City-focused push

Audience:

- Start with Asgabat unless data says otherwise.
- Expand to cities where demand exists.

Goal:

- Build density.
- Recruit sellers/dealers city by city.
- Avoid empty-market disappointment.

Exit:

- City scorecard shows stable supply, demand, and trust.

### Stage 4: Broader TM growth

Audience:

- Wider public marketing.
- Partnerships.
- Dealer acquisition motion.

Goal:

- Scale without breaking reliability or moderation.

Exit:

- Month-3 review decides Phase 2 investment priority.

## Post-launch review templates

### Daily launch review

Use this agenda during launch week:

1. Reliability: OTP, uploads, API, push, SMS phones.
2. Liquidity: qualified connections, connection rate, listing views.
3. Supply: active listings, new listings, publish funnel.
4. Demand: DAU, searches, saved searches, favorites.
5. Trust: reports, bans, moderation response time.
6. City gaps: top demand cities, top supply cities, zero-result cities.
7. Actions: one owner, one fix, one deadline per red metric.

### Weekly growth review

Use this agenda after week 1:

1. What changed in the north-star metric?
2. Which city has the clearest supply/demand gap?
3. Which funnel step is losing the most users?
4. Which dealer/seller behavior is blocking liquidity?
5. Which reliability issue blocks growth?
6. Which manual outreach should happen this week?
7. What do we explicitly defer?

## First 30-day targets

These are early operating targets, not investor promises.

| Metric | Target | Why |
|---|---|---|
| OTP success | >= 95% | Auth must work |
| Upload success | >= 95% | Sellers must publish |
| Active listings | 30+ by day 30 | Marketplace cannot look empty |
| Verified dealers | 2+ by launch, more by day 30 | Trust and supply |
| Qualified connection rate | Non-zero in week 1, improving by week 4 | Liquidity |
| Zero-result searches | < 30% | Catalog/supply relevance |
| Moderation queue | Cleared daily | Trust |
| P0/P1 bugs | 0 unresolved at launch | Operational safety |

## Serious-review triggers

Run a serious review if any of these happen:

- OTP success under 95% for more than 24 hours.
- Image upload success under 95% for more than 24 hours.
- Fewer than 30 active listings after launch month.
- Qualified connection rate near zero despite listing views.
- More than 30% of searches return zero results.
- Seller response time is consistently bad.
- Moderation queue cannot be cleared daily.
- Fewer than 2 active verified dealers after launch month.
- Users abandon listing creation before publish at high rates.
- City demand exists but no supply can be recruited.

Serious review outcomes:

- Reliability problem: stop growth and fix infra/SMS/upload.
- Supply problem: direct seller/dealer outreach and seed listings.
- Demand problem: improve SEO/content/community distribution.
- Conversion problem: fix listing detail/contact UX.
- Trust problem: tighten moderation, reports, and dealer verification.

## Implementation mapping

This plan should not silently rewrite sprint scope. Use this mapping when slicing issues.

| Work | Sprint / phase | Blocking? |
|---|---|---|
| Listing view/publish/favorite/search/contact events | S4-S7 as features land | Yes for launch-critical subset |
| Saved-search and notification events | S8 | Yes for saved-search launch flow |
| Admin metrics dashboard | S9 | Yes for MVP scorecard |
| Marketplace metrics aggregates | S9 | Yes |
| Legal/store data disclosures | S10 | Yes |
| Launch gates/rollback support | S10 | Yes |
| Feedback form | Phase 1.5 | No |
| Dealer monthly analytics report | Phase 1.5 / Phase 2 | No |
| Inspection analytics | Phase 2 | No |
| Ad campaign analytics | Phase 2+ | No |
| BI exports | Phase 2+ | No |

## Privacy and compliance checklist

Before app-store submission, confirm:

- Privacy Policy says exactly what is collected.
- App Store privacy nutrition labels match the code.
- Google Play Data Safety answers match the code.
- No third-party analytics SDK is bundled.
- No raw GPS collection exists in MVP.
- Saved searches store catalog city/region IDs, not coordinates.
- Analytics payloads do not include full phone numbers.
- Account deletion flow exists and has been tested.
- Admin audit logs are separate from product analytics.

## Open questions

- What exact first 30-day numeric target should we set for qualified connections per active listing after beta data exists?
- Does S7 launch with chat fully enabled, or does call/contact carry the first connection metric until chat stabilizes?
- Should the first city-focused push be Asgabat by default, or should beta demand choose the first city?
- How much manual seller/dealer outreach is the team willing to do in launch month?
- What is the minimum support schedule for week 1: business-hours only or near-real-time?

## References

- [ADR-0010](../../adr/0010-testing-obs.md) - Testing and observability stack
- [ADR-0022](../../adr/0022-city-first-listing-location.md) - City-first listing location
- [ADR-0023](../../adr/0023-first-party-product-analytics.md) - First-party product analytics for MVP
- [00-vision.md](../00-vision.md) - 12-month success metrics and anti-goals
- [03-roadmap.md](../03-roadmap.md) - Phase 1 sprint trajectory
- [40-admin.md](../features/40-admin.md) - Admin dashboard
- [80-deployment-runbook.md](80-deployment-runbook.md) - Deploy and rollback
- [81-monitoring-alarms.md](81-monitoring-alarms.md) - Operational monitoring
- [83-legal.md](83-legal.md) - Privacy and Terms planning
- [84-launch-plan.md](84-launch-plan.md) - Launch cutover checklist
