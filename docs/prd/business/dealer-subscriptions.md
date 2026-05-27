# AutoTM Dealer Subscription Tier Design

> **Status**: Strategy doc, drafted 2026-05-18. Mutable; not an ADR.
> **First matters in**: Post-MLP dealer bet. MLP beta proves listing/contact demand first; dealer subscriptions return after dealers are actively posting enough inventory.
> **Why it exists**: This is the **most recurring, most defensible revenue stream** AutoTM has. Dealers have budgets; they make business decisions; they LTV at 3-5+ years. Subscription revenue compounds in a way inspection fees + ads don't.

---

## The honest pitch — what we're actually selling

**Software-as-a-service to TM car dealerships**: better tooling, branding, analytics, and customer-acquisition channels than they have today. Not "pay to be featured" (that's banned per vision). It's "pay to look professional, post more efficiently, and learn what's working."

The product is fundamentally a **dealer productivity suite** built on top of AutoTM's marketplace. Dealers pay because:

1. **Branding**: PRO badge + dealership profile page positions them as professional vs. flippers
2. **Volume**: unlimited listings + bulk upload vs. individual-account limits
3. **Analytics**: which listings get views, which converts, response time, where buyers come from
4. **Workflow**: dealer dashboard, multi-staff accounts, inventory management
5. **Customer acquisition**: prioritized inclusion in search filters, dealer-page browse, lead routing

What we DON'T sell: pay-to-rank, pay-to-feature, pay-to-spam-buyers. The vision constraint stands.

---

## Why this is the most reliable revenue stream

| vs. Inspections | vs. Advertising | Dealer subs win because |
|---|---|---|
| Predictable monthly recurring | Variable per-quarter ad spend | Forecastable; planable |
| Ops light (mostly software) | Ops heavy (sales team) | Higher margin |
| Compounds with churn-only attrition | Compounds with advertiser churn (high) | Lower customer acquisition cost / LTV ratio |
| Dealers self-onboard at scale | Each advertiser needs custom pitch | Self-serve viable |
| Independent of physical operations | Independent of physical operations | Both ops-light vs. inspections |

By Year 3-5, dealer subs are likely 30-40% of total revenue. The growth is steady, not lumpy.

---

## The TM dealer ecosystem — what we're actually selling into

### Dealer landscape (estimated)

| Segment | Approx count in TM | Behavior today | Likelihood to subscribe |
|---|---|---|---|
| **Brand-authorized large dealers** | 10-30 | Use Instagram + walk-ins + existing dealer websites; some lease space at car bazaars | High once persuaded |
| **Multi-brand showrooms** | 30-100 | Mix of online + bazaars; some on auto.tm legacy | Medium-high |
| **Small commercial dealers** (10-50 cars in inventory) | 100-300 | Mostly Instagram + bazaars; spotty digital presence | Medium |
| **Garage flippers** (5-20 cars, informal) | 200-500+ | Phone + word-of-mouth + bazaars | Low-medium |
| **Brokers / individuals selling consigned cars** | 100-300 | Personal accounts; no formal business | Very low |

**Total addressable dealer market**: ~500-1000 entities. Realistically convertible to paid subs: 200-500 over 3-5 years.

### What dealers spend on today (their alternative)

- **Car bazaar rent**: $200-1000/month for a spot at major Aşgabat bazaars (Garadje, Bichalovka, etc.) — many use this AND online
- **Instagram ads**: $50-500/month informal — most dealers do this
- **Facebook/WhatsApp groups**: free but inefficient
- **Auto.tm legacy listings**: mostly free; some had paid features
- **Word of mouth**: free but doesn't scale

Total dealer marketing spend per dealer per month: $200-1500 depending on size. **Of that, $50-200/month for AutoTM PRO subscription is realistic** — they're already spending the alternative.

### What dealers tell us they want (research before launch needed)

Hypothetical — should be validated with real dealer interviews in pre-Phase-2:

- Faster listing creation (bulk upload from inventory CSV)
- Identity signal (looking professional)
- Lead capture (chat leads in one inbox)
- Inventory management (mark cars sold quickly)
- Analytics (which listings perform)
- Multiple staff accounts
- Branding (dealership name, logo, address)
- Featured-dealer-page-on-AutoTM
- Customer reviews / reputation
- Inspection bundle (Phase 2 — paid inspection at discount)

**Open question — must validate**: Are any of these compelling enough to drive $50-200/month subscription, or are dealers happy with free?

---

## Tier design — three concrete tiers

After considering many options (single tier, four tiers, feature-based), the cleanest mental model: **3 tiers**, plus a free starter. Most subscription products have this shape because users self-categorize easily.

### Tier 0 — Starter (Free)

For **individual sellers + tiny dealers + tire-kickers**.

| Capability | Limit |
|---|---|
| Listings per month | 3 active |
| Photos per listing | 20 (standard) |
| Listing duration | 30 days, then auto-archive |
| Wizard access | Full 7-step (no restrictions) |
| Listing editing | Full |
| Mark sold / archive / republish | Full |
| Basic stats | Views per listing |
| Contact threads | Yes (when S6 ships) |
| Profile page | Personal user profile only — no dealership page |
| Verified dealer badge | NO |
| Bulk upload | NO |
| Multi-staff accounts | NO |
| Analytics | Basic only (view counts) |
| Phone support | NO (community forum only) |

**Why give this for free**: Acquisition channel for paid tiers. ~80% of dealers will start here. Some will graduate.

### Tier 1 — Dealer Basic ($30-40/month, $300-360/year prepay discount)

For **small commercial dealers** — the "I sell 20 cars a year" segment.

| Capability | What's included |
|---|---|
| Listings per month | 25 active |
| Dealership profile page | YES — basic page (name, logo, address, contact) |
| Verified dealer badge | YES (after AutoTM verifies business documents) |
| Photos per listing | 30 (vs 20 free) |
| Listing duration | 60 days |
| Bulk upload from CSV | NO (still single-listing creation) |
| Multi-staff accounts | NO (one account per subscription) |
| Stats per listing | Views + saves + chat-initiated count |
| Listings dashboard | YES — see all your listings, sort by performance |
| Customer leads inbox | YES — see who messaged about each listing |
| Inspection discounts | $10 off each AutoTM inspection (Phase 2+) |
| Featured-on-dealer-browse | Yes — appears in /dealers directory |
| Phone support | Limited — email response within 24h |

**Pricing rationale**: $35/month is roughly 1-3% of monthly inventory turnover. Comparable to Instagram ad budget for small dealers. Annual prepay (~15% discount → $300) reduces churn and improves cash flow.

### Tier 2 — Dealer Pro ($80-120/month, $960-1080/year prepay)

For **multi-brand showrooms + mid-size commercial dealers**.

| Capability | What's included |
|---|---|
| Listings per month | 100 active |
| Dealership profile page | YES — enhanced (gallery, opening hours, services, multiple photos) |
| Verified dealer badge + PRO badge | YES + PRO badge variant |
| Photos per listing | 30 |
| Listing duration | 90 days |
| Bulk upload from CSV | YES — upload inventory CSV; AutoTM auto-creates listings |
| Multi-staff accounts | YES — up to 3 staff users; per-user activity audit log |
| Stats | Full — views, saves, contacts, response rate, time-to-sell average |
| Listings dashboard | Enhanced — filters by status, search, bulk edit, bulk publish/archive |
| Customer leads inbox | Shared inbox across staff; assign to staff member; response-time tracking |
| Inspection discounts | $15 off each AutoTM inspection (Phase 2+) |
| Featured-on-dealer-browse | Higher priority in /dealers directory |
| Live chat support | Yes — business hours response (within 4h) |
| Account manager | NO |
| API access | NO (Year 2+ feature) |

**Pricing rationale**: $100/month is a small marketing line-item for a dealer doing 5+ sales/month. Bulk upload alone saves 5-10 hours/month — that's the killer feature for paid mid-tier.

### Tier 3 — Dealer Enterprise ($300-500/month or custom)

For **brand-authorized large dealers + manufacturer-affiliated showrooms**.

| Capability | What's included |
|---|---|
| Listings per month | Unlimited |
| Dealership profile page | YES — full customization (custom URL, brand colors within constraints, full image gallery, embedded video, full services + financing) |
| Verified dealer badge + Enterprise tag | YES |
| Photos per listing | 50 |
| Listing duration | 180 days |
| Bulk upload from CSV | YES + API |
| Multi-staff accounts | Unlimited |
| Stats | Full + custom analytics + monthly summary report |
| Listings dashboard | Same as Pro + custom dashboards |
| Customer leads inbox | Same as Pro + CRM-style lead pipeline + lead routing rules |
| Inspection discounts | $25 off each AutoTM inspection (Phase 2+) + priority booking |
| Featured-on-dealer-browse | Top priority |
| Account manager | Yes — dedicated AutoTM account manager + quarterly business review |
| API access | YES — list / create / update / delete listings via REST API |
| White-glove onboarding | YES — AutoTM team trains dealer staff |
| Custom integrations | YES — AutoTM team works on bespoke needs (e.g., integrate with dealer's inventory system) |

**Pricing rationale**: At $400/month average, this targets the 10-30 large dealers willing to invest in serious digital tools. They probably spend $1k+/month on Instagram + bazaar + their own website now; AutoTM Enterprise replaces parts of that.

### Special case — Inspection-staff plan (Phase 2)

When AutoTM hires inspectors, they're internal staff. Not a customer subscription — separate.

### Special case — Insurance / Bank partner accounts

Banks (auto loans) + insurance companies that integrate via API for loan/quote leads — these are advertisers, not dealers. See [`ad-sales-strategy.md`](ad-sales-strategy.md).

---

## Pricing — three honest considerations

### TM payment friction

The thorniest non-product problem.

| Payment method | Feasibility in TM | Risks |
|---|---|---|
| **Bank card (debit/credit)** | Limited adoption; international cards rare; local cards exist (Daýhan, etc.) | Payment processor for cards in TM is hard; few options |
| **Bank transfer** | Standard B2B in TM | Manual reconciliation; 1-3 day delay |
| **Cash on visit** | Very common in TM business | Doesn't scale; sales rep must collect |
| **Mobile payment** | TM has no Apple Pay; some local mobile money | Limited |
| **Foreign currency** | USD payments restricted; only manat available domestically | Complicates pricing strategy |

**Practical Phase 1 approach**: Bank transfer (invoiced monthly) for Dealer Basic/Pro/Enterprise. AutoTM finance team sends invoice → dealer pays via bank transfer → AutoTM marks paid manually → renewal proceeds.

**Year 2+**: Build card-payment-acceptance integration with local TM banks (if API exists). Possibly Telegram Pay or other emerging payment methods if they reach scale.

**Risk**: Manual collection is fragile. ~5-10% of dealers will pay late or stop without explicit cancellation. Need clear retention/dunning playbook.

### Pricing in TMT vs. USD

Prices above are in USD for clarity. In actual product:
- Pricing displayed and billed in **TMT** primarily
- USD-equivalent shown for reference (helpful for international-thinking dealers)
- Annual prepay locked at fixed TMT rate; doesn't fluctuate with FX

Approximate TMT pricing at current FX rates:
- Dealer Basic: 300-350 TMT/month
- Dealer Pro: 700-1050 TMT/month
- Dealer Enterprise: 2600-4400 TMT/month

### Discounting + concessions

For the first year:
- 30-50% intro discounts to first 10-20 dealers ("founding dealer" pricing) — get logos + case studies
- Free 1-month trials for any new dealer
- Annual prepay 15-20% discount across all tiers

Don't discount below break-even per dealer. Compute fully-loaded cost-to-serve (sales + onboarding + support + churn) and floor pricing there.

---

## Software integration — what we actually build

### Post-MLP dealer bet — basic subscription infrastructure

**Subscription model + auth**:

- `SubscriptionTier` enum in `apps/api/src/modules/identity/` (or new `apps/api/src/modules/billing/`): 'starter', 'dealer_basic', 'dealer_pro', 'dealer_enterprise'
- `Subscription` entity: user/dealership ID, tier, current period start/end, status (active/expired/grace_period), payment method, last payment received
- `BillingEvent` entity: invoices issued, payments received, refunds
- API endpoints for admin to manage subscriptions (post-MLP admin/dashboard expansion)
- API endpoints for dealers to see their own subscription status

### Dealer profile page (post-MLP)

- `DealershipProfile` entity in identity context: name, logo, address, opening hours, description, gallery photos
- Public-facing page at `/dealers/:slug`: shows all the dealership's active listings + profile info + lead capture form
- Mobile + web both surface this page

### Listing limits + tier-gating (post-MLP)

The listing creation flow checks the seller's subscription tier:

- If `user.subscription.listingLimit !== 'unlimited'` and `user.activeListingCount >= user.subscription.listingLimit`: block creation with upgrade prompt
- Listing duration enforced at `Listing.publishedAt + tier.durationDays`; auto-archive cron belongs with the shaped dealer/subscription bet
- Photo count limit: enforced in `AttachMedia` use-case

### Bulk upload + CSV (post-MLP)

For Dealer Pro and Enterprise:

- New mobile/web "Bulk upload" screen
- Dealer uploads a CSV with columns: brand, model, year, mileage, price, currency, condition, photos[], description
- Server validates each row against the schema (using existing `@auto-tm/contracts`); creates Listing rows for valid entries; reports errors per row
- Photos referenced by URL or pre-uploaded keys; bulk upload assumes photos already accessible

### Multi-staff accounts (post-MLP)

For Dealer Pro and Enterprise:

- New entity: `DealershipMember` (already in schema) — links Users to Dealerships with a role (owner / sales)
- Per-member activity audit logging
- Lead inbox routing by member (lead assignments)
- Permission model: owner can manage subscription + invite staff; sales can manage listings only

### Dashboard + analytics (post-MLP)

For all tiers (different depth per tier):

- Listings dashboard: filter / sort / bulk edit
- Per-listing analytics: views, saves, chats, response time, time-to-sell (when listing closes)
- Aggregated analytics: dealer's total inventory turnover, average price drop, peak buyer activity hours
- Tier 3 has scheduled monthly summary reports

### API access (Year 2-3)

For Dealer Enterprise:

- REST API: list/create/update/delete listings via authenticated API key
- Webhook support: notify dealer's system when new lead arrives
- Rate-limited per tier

### Software cost estimate

- Subscription infrastructure: 2-3 weeks
- Dealer profile pages: 2-3 weeks
- Tier-gating + limits: 1-2 weeks
- Bulk upload: 2-3 weeks
- Multi-staff accounts: 2-3 weeks
- Dashboard + analytics: 3-4 weeks (basic) + 2-3 weeks for advanced
- API access: 3-4 weeks (Year 2-3)
- **Total dealer feature appetite**: ~12-15 weeks if built as a full suite. This must be split into smaller shaped bets after MLP learning.

---

## Sales motion — getting dealers to actually pay

### Year 1: Founder-led + outreach

**Pre-launch:**
- Interview 20-30 dealers; understand their workflow today; validate willingness to pay
- Identify 10-15 "lighthouse" dealers willing to be early adopters

**Phase 1 launch:**
- Hand-onboard first 5-10 dealers personally (founder + ops)
- Free 3-6 month trial; collect feedback; iterate features
- Convert trials to paid at end of year 1

**Year 1 target**: 20-30 paid dealers; $500-1500/month MRR; mostly Basic + Pro tiers

### Year 2: Sales role

- Hire 1 sales-and-account-management person
- Outbound to remaining 50-100 viable dealers in TM
- Self-serve sign-up for smaller dealers (online onboarding flow)
- Account management for existing accounts (renewals, upsells)

**Year 2 target**: 80-150 paid dealers; $5k-15k/month MRR

### Year 3+: Self-serve + AM

- Self-serve sign-up handles most new dealers
- Account manager for Enterprise tier specifically (high-touch)
- Sales role transitions to "Solutions Consultant" for Enterprise prospects
- Marketing drives organic awareness — blog content, case studies, conferences

**Year 3-5 target**: 200-500 paid dealers; $30k-80k/month MRR

### The dealer pitch — what we actually say

For a TM dealer who's never used SaaS before, the pitch is concrete + ROI-focused:

> "Your dealership currently posts cars to Instagram + maybe auto.tm. You spend hours per week formatting photos + writing descriptions. You probably miss buyer messages because they come on multiple channels. You don't know which cars sell fastest at which price.
>
> AutoTM Pro is your dealership's command center for selling cars. Bulk-upload your whole inventory in 10 minutes. Everyone messaging you about cars goes to one inbox. Real numbers on which listings work. Discount on AutoTM inspections so your buyers trust you.
>
> $80/month. Cancel anytime. First 60 days free if you sign up this month."

The math: if a dealer saves 5 hours/week (worth $50-100 in lost selling time) + sells one extra car/year because of better UX, it's break-even at $80/month easily. Real ROI is harder to demonstrate; word-of-mouth from satisfied dealers does the heavy lifting.

### Onboarding flow — 30-minute path to value

Critical that dealers feel value within 30 minutes:

1. **Sign up** (5 min): account + dealership name + verification documents uploaded
2. **Get verified** (asynchronous; AutoTM team approves within 24-48h) → PRO badge appears
3. **Bulk upload first 10 cars** (10 min for an experienced dealer with CSV ready)
4. **Set up dealership page** (10 min): logo + hours + description
5. **First listing live**: under 30 minutes from sign-up

If any step takes 2x longer in practice, fix it.

### Anti-churn — keeping dealers subscribed

Churn rate at 5% monthly = 60%/year. Targeting <3% monthly:

- Dealer onboarding emphasizes value within first 7 days (otherwise they'll cancel at month 1)
- Monthly performance email: "Your listings got X views, Y leads, Z sales attributable"
- Quarterly business review for Pro + Enterprise: account manager call, listen to needs
- Cancel-flow: ask why; offer pause-vs-cancel option; sometimes 1-month free saves them
- Feature requests prioritized for paying customers (track who asked for what)

---

## Edge cases + failure modes

### Subscription failures

**1. Dealers expect everything free.**

- **Probability**: Very high in early days. TM businesses skeptical of paid software.
- **Mitigation**:
  - Generous free trial (3-6 months for first cohort)
  - Clear value differentiation (Tier 0 has obvious limitations; "to remove these, upgrade")
  - First paying dealers become case studies
  - Be patient — TM business culture takes 12-24 months to internalize SaaS

**2. Dealer signs up, doesn't use it, churns at month 1.**

- **Probability**: 30-50% in Year 1.
- **Mitigation**:
  - Onboarding-call-required for Pro+ tiers (high-touch)
  - "First listing live" trigger email if not active in week 1
  - Pause option (3 months no charge) instead of cancel — many "cancellers" come back
  - Calculate true LTV after 12 months; churn early users aggressively from forecasts

**3. Payment collection failures.**

- **Probability**: 10-20% of monthly invoices initially.
- **Mitigation**:
  - 7-day grace period after invoice issued; account becomes read-only at day 14; account suspended at day 30
  - Annual prepay options (cash up-front; no monthly collection risk)
  - Personal follow-up by AutoTM staff for >$500 monthly invoices
  - In TM context: accept cash if necessary; deposit + manually mark paid

**4. Tier confusion — dealer doesn't know which to pick.**

- **Probability**: High initially.
- **Mitigation**:
  - Decision tree on pricing page: "Sell <5 cars/month? Try Free." "5-30/month? Dealer Basic." Etc.
  - Comparison table emphasizing features per tier
  - Allow free downgrade (Pro → Basic) anytime; only upgrade requires payment authorization

**5. Free tier abuse — fake dealer accounts to bypass listing limits.**

- **Probability**: Some, especially smart "flipper" individuals.
- **Mitigation**:
  - Verify business documents for Verified Dealer badge — without that badge, sellers look like individuals
  - Listing limits enforced per-account at API level (can't trivially game)
  - If single phone/email appears across multiple accounts → flag for review

### Operational failures

**6. Verification process bottlenecks.**

- **Risk**: Dealer waits 5 days for verification → frustrated → churns
- **Mitigation**: 24-hour verification SLA. Hire 1 part-time verification staffer. Automate easy cases (clear business documents + no red flags = auto-approve).

**7. Multi-staff accounts feature is harder than expected.**

- **Risk**: Permission edge cases (what if owner leaves the dealership? What if Sales staff posts wrong information?). Each is a UX decision.
- **Mitigation**: Ship simple version first (single role split: Owner vs Sales). Iterate based on real usage.

**8. Bulk upload errors flood support.**

- **Risk**: Dealer uploads CSV with 50 cars; 30 fail validation; support team gets 30 emails/dealer.
- **Mitigation**:
  - In-product error display per row (not via email)
  - "Re-upload only failures" feature
  - Bulk upload template + sample CSV with examples

**9. Feature creep — tier ladders blur.**

- **Risk**: Year 2-3, dealers ask "can I get Feature X without upgrading?" Sales says yes once → feature now in cheaper tier → tier signaling breaks.
- **Mitigation**: Strict tier governance. Annual review of feature/tier assignments. No "one-time" exceptions in product (only in pricing).

### Strategic failures

**10. Existing competitor (auto.tm legacy) competes aggressively on price.**

- **Risk**: Free competitor → all dealers stay on legacy
- **Mitigation**:
  - Quality differentiation (visibly better product)
  - Lock in lighthouse dealers early with annual contracts
  - Compete on UX not price (per Y Combinator playbook)

**11. Dealer ecosystem too small for sub revenue at scale.**

- **Risk**: TM has only 200-300 real dealers; even capturing 80% = 200-250 subscriptions. Revenue ceiling = ~$300-500k/year.
- **Mitigation**:
  - Accept this as ceiling; diversify revenue streams (ads + inspections)
  - Consider expanding to "small business" segment beyond traditional dealers (e.g., individual flippers as "Power Sellers" tier)

**12. Power Sellers loophole.**

- **Risk**: Individuals running de facto dealerships (15+ cars/year) but registering as individuals to avoid subscription
- **Mitigation**:
  - Listing limit per account (Tier 0 caps at 3/month) makes this unviable
  - Power Seller tier ($15-25/month) for individuals selling 4-10 cars/year — captures this segment without forcing them into dealer category
  - Phone number reuse detection (Phase 2 — also surfaced for flipper concern in PRD 32)

### Software failures

**13. Subscription state desync.**

- **Risk**: Payment processed but `subscription.status` not updated; dealer charged but features still locked.
- **Mitigation**:
  - Idempotent payment webhooks
  - Audit log all subscription state changes
  - Daily reconciliation job: compare BillingEvent table vs Subscription state; flag inconsistencies
  - 24/7 support escalation for "I paid but feature isn't working"

**14. Subscription downgrade breaks data.**

- **Risk**: Dealer drops from Pro to Basic; suddenly 50 active listings exceed Basic's 25-listing limit; system crashes
- **Mitigation**:
  - Downgrade preserves all listings; over-limit ones marked "frozen" (visible to dealer + can be archived/republished, but not editable for new content); 30-day grace period to manage down
  - Clear UI feedback: "You have 50 active listings but Basic supports 25. Choose 25 to keep active or upgrade back."

---

## Biases I'm working against — explicit self-check

**Bias 1**: I'm assuming dealers will accept a SaaS model. **Counter**: TM business culture may strongly prefer one-time payments or transactional fees. "Recurring monthly" might feel alien. Mitigation: emphasize annual prepay options (one-time payment); offer "lifetime deal" for first 10 dealers as marketing tactic.

**Bias 2**: I'm assuming dealers will accept self-serve onboarding. **Counter**: Many dealers will want hand-holding from sales person; self-serve may have <20% completion in TM. Mitigation: hybrid model — self-serve registration + human onboarding call for Basic+; full assisted onboarding for Pro+.

**Bias 3**: I'm assuming dealer pool is 500-1000. **Counter**: TM dealer ecosystem may be smaller. Actual count of dealers serious about digital may be 100-300. Mitigation: validate via direct outreach pre-launch; adjust revenue projections downward if needed.

**Bias 4**: I'm pricing in USD but dealers think in TMT. **Counter**: TMT pricing should be primary; USD secondary. Mitigation: launch pricing pages in TMT first; USD shown as helpful conversion.

**Bias 5**: I'm assuming verification works. **Counter**: TM has informal business culture. "Official documents" may not exist for many small dealers (LLC paperwork is patchy). Mitigation: accept multiple proof types (LLC docs, tax records, photo of business signage at storefront, AutoTM-staff visit).

**Bias 6**: I'm assuming bulk upload is the killer feature. **Counter**: Dealers may not have inventory in CSV form; they have it in Excel + photos in Telegram + memory. Mitigation: ship "import from Excel" + a manual-but-fast inventory uploader; CSV is one option, not the only one.

**Bias 7**: I'm assuming multi-staff accounts matter early. **Counter**: Most small dealers in TM are 1-2 people. Multi-staff is Enterprise-only feature. Mitigation: ship single-account Pro tier; multi-staff in Year 2 or Pro-tier extra.

**Bias 8**: I'm assuming dealers will pay in advance. **Counter**: TM business culture often prefers payment after value is delivered. Mitigation: net-15 invoicing accepted for verified Pro+ accounts; smaller deposit + balance after first 30 days for new dealers.

**Bias 9**: I'm assuming churn rate of 3-5% monthly. **Counter**: TM may have 7-10% monthly churn in Year 1 (lots of "trying it out" then leaving). Mitigation: forecast on lower-end of retention; plan for replacement onboarding cadence.

---

## Open questions / TBD

1. **Pre-launch dealer interviews** — 20-30 dealers to validate willingness-to-pay + feature priorities. Critical, not optional.
2. **Verification documents** — what's the minimum acceptable proof of "real dealership" in TM legal context?
3. **Payment infrastructure** — which TM banks offer business payment processing? Are there fintech alternatives?
4. **Account ownership transfer** — if dealer changes hands, how do they hand off their AutoTM account (with active subscription + listings)?
5. **Refund policy** — what if dealer cancels mid-month? Pro-rata? No refund? Industry standard varies.
6. **Multi-location dealer chains** — handle as one subscription with multiple location-pages, or as multiple subscriptions? Unclear demand.
7. **Tax treatment** — VAT on dealer subs? AutoTM as B2B SaaS in TM may have specific tax handling.
8. **Lighthouse pricing for first dealers** — how generous (50% off forever vs. 50% off year 1)?
9. **Tier reorganization in Year 2** — if data shows Basic users are mostly individuals (not dealers), do we restructure tiers?

---

## Success metrics

| Metric | Year 1 target | Year 3 target | Year 5 (peak) target |
|---|---|---|---|
| **Paid dealer subscriptions (total)** | 25 | 150 | 400 |
| **Tier distribution** | 80% Basic / 15% Pro / 5% Enterprise | 60% Basic / 30% Pro / 10% Enterprise | 55% Basic / 35% Pro / 10% Enterprise |
| **Monthly recurring revenue (MRR)** | $1,000 | $20,000 | $50,000 |
| **Annual recurring revenue (ARR)** | $12k | $250k | $600k |
| **Monthly gross churn rate** | 7-10% | 4-5% | 3-4% |
| **CAC (customer acquisition cost)** | $200 (founder time) | $400 | $600 |
| **LTV (lifetime value)** | $600 | $2,500 | $4,000 |
| **LTV/CAC ratio** | 3x | 6x | 7x |
| **% of dealers using bulk upload** | 30% (of Pro+) | 70% (of Pro+) | 80% (of Pro+) |
| **Self-serve onboarding completion rate** | 50% | 75% | 80% |

If Year 2 we're below 50 paid dealers → major rethink of pricing / packaging / sales motion needed.

---

## Cross-references

- [`../00-vision.md`](../00-vision.md) — Anti-goals: no paid placement (subscription is different — sells software/branding, not search ranking)
- [`../03-roadmap.md`](../03-roadmap.md) — dealer subscription work is a post-MLP bet
- [`../features/`](../features/) — future feature PRDs: `35-dealer-pages.md`, `36-subscriptions-billing.md` (TBD)
- [`../../adr/0013-user-role-split.md`](../../adr/0013-user-role-split.md) — `DealershipMember.role` separate from `User.role`
- [`inspection-program.md`](inspection-program.md) — Inspection discounts are a Dealer Pro+ benefit; cross-program partnership
- [`ad-sales-strategy.md`](ad-sales-strategy.md) — Dealers sometimes also buy brand sponsorships separate from subscriptions
