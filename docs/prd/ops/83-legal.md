# 83 — Legal documents (Privacy Policy + Terms of Service)

## Why this doc exists

Apple App Store and Google Play Store both require:

- A Privacy Policy URL at submission time
- Terms of Service for any app that handles user accounts and user-generated content

Plus EU GDPR (if we ever serve EU users — relevant for TM diaspora) and TM data law require disclosures. This PRD page outlines **what content** these legal docs must include. The actual legal text should be reviewed by a Turkmenistan-licensed lawyer before launch.

## Where they live

- Public URLs: `https://auto.tm/<lang>/legal/privacy` and `https://auto.tm/<lang>/legal/terms`
- Served by `apps/web` as static markdown rendered server-side
- Linked from mobile app (Settings → About → Privacy / Terms)
- Linked from admin app (footer)
- Required versions: RU + TK + EN (trilingual)

## Consent UX in auth

S2 phone OTP uses implicit agreement copy on the phone entry screen:

> By continuing, you agree to the Terms and Privacy Policy.

The Terms and Privacy Policy labels link to the canonical public web URLs above, opened from mobile via an in-app browser or custom tab when available. Do not add a checkbox in S2 unless legal review requires explicit recorded acceptance.

If explicit recorded acceptance is required later, record the accepted terms version, privacy version, locale, and timestamp during first account creation or OTP verification. This is a legal-review follow-up, not part of the S2 OTP implementation.

## Privacy Policy — required sections

| Section | Content |
|---|---|
| **What we collect** | Phone number (auth), name and profile photo if enabled, location (region/city) selected by user or attached to a listing as car location, listings the user posts, simple contact-thread messages, device info needed for debugging (model, OS, app version), IP address for rate limiting/security, photo uploads, VIN if the user enters one |
| **Future collections if features ship** | Push token (if native push ships), video uploads (if video ships), garage vehicle data (if Garage ships), blog content (if Bortzhurnal ships), inspection data (if reports ship) |
| **What we do NOT collect** | We do NOT track location via GPS in the MLP beta. We do not store raw GPS coordinates in saved searches or location analytics. We do NOT have third-party advertising SDKs. We do NOT sell data. |
| **Why we collect it** | Account creation, listing display, search functionality, communication between users, fraud prevention, app store policy compliance |
| **Who can see it** | Public: name/avatar if shown, active listings, public listing photos and listing location city/region. Private: phone, contact-thread messages except admin moderation, exact location pin if a future phase adds it. Public Garage, public blog posts, response-time stats, and inspection reports are visible only if those later features ship. |
| **Sharing with third parties** | MLP beta uses AutoTM-owned auth and hosting. If native push ships later, Firebase Cloud Messaging (Google) and Apple Push Notification Service receive the recipient's device token and notification payload. We do not share data with advertisers, brokers, or other third parties. |
| **Data retention** | User data retained while account is active. After account deletion: 30-day grace period, then PII removed. Listings, messages, moderation reports, and audit rows are preserved with "Deleted user" / historical attribution for audit trail. S8 must verify implementation matches this before beta; the S2 hard-delete endpoint is not the beta target. |
| **User rights** | Right to access (export your data), right to delete (account deletion in-app or documented beta support path), right to correct (edit profile/listing fields), right to opt out of marketing notifications if marketing notifications ever ship |
| **Children's privacy** | App not intended for users under 18 (consistent with auto purchase being adult-only); we do not knowingly collect data from minors |
| **Cookies (web only)** | HTTP-only session cookies for admin login in `apps/admin`; `apps/api` still accepts bearer auth only. No analytics cookies in the MLP beta. |
| **Security** | HTTPS in transit; bcrypt-hashed refresh tokens; encrypted-at-rest disk; TM-hosted servers; admin actions audit-logged |
| **Contact** | Email + physical address for privacy inquiries |
| **Changes to policy** | Users notified in-app or through the documented beta support channel when policy changes materially; effective date displayed |
| **Jurisdiction** | Turkmenistan law applies |

## Terms of Service — required sections

| Section | Content |
|---|---|
| **Eligibility** | Must be 18+; must agree to abide by these terms |
| **Account responsibilities** | User responsible for keeping phone access secure; user responsible for content they post |
| **Acceptable use** | Listings must be for real cars user owns or represents; no scams, fraud, harassment, illegal content, intellectual property infringement |
| **Listing accuracy** | Sellers represent their listings accurately; misrepresentation may result in suspension |
| **Prohibited content** | Spam, duplicate listings, stolen vehicles, vehicles with active liens (without disclosure), illegal modifications |
| **Communication** | Users agree to receive transactional messages needed to operate the service (OTP and contact-thread messages). Native push and marketing notifications require the later notification feature and marketing remains opt-in. |
| **Disclaimer** | AutoTM is a marketplace; we do not own / inspect / warrant listed cars (except where Phase 2 inspection report explicitly applies). Transactions are between users. |
| **Inspection reports (Phase 2)** | Reports are AutoTM's good-faith assessment; not a warranty; buyers should perform independent verification |
| **Dealer terms** | Dealer accounts, PRO badge, and dealership verification are post-MLP features. If shipped, dealers are responsible for accuracy of all listings under their account. |
| **Termination** | Users can delete account in-app at any time; AutoTM can suspend accounts that violate these terms |
| **Liability** | AutoTM not liable for user-to-user disputes, transactions, or content (within legal limits) |
| **Modifications** | We may update terms; material changes communicated in-app or through the documented beta support channel |
| **Governing law** | Turkmenistan |
| **Contact** | Email + physical address |

## Format

- Plain Markdown rendered server-side by Next.js
- Versioned (URL: `/legal/privacy/v1`, latest also at `/legal/privacy`)
- Effective date shown prominently
- Print-friendly (CSS print stylesheet)

## When to update

- Material changes (new data collection, new third-party integration, expanded liability): publish new version + in-app announcement via admin broadcast
- Minor typo / clarification fixes: edit in place, increment "Last revised" date

## App Store / Play Store submission checklist

- [ ] Privacy Policy URL: `https://auto.tm/en/legal/privacy`
- [ ] Privacy nutrition label (Apple) filled in to match what the Privacy Policy says
- [ ] Data Safety section (Google Play) filled in to match
- [ ] "Account Deletion" feature: shows `/me/delete` flow (see [Feature 30](../features/30-identity.md))
- [ ] No third-party SDKs that share data without disclosure
- [ ] No ATT prompt needed in the MLP beta (no ad SDKs)

## Open questions

- Do we need a Cookies Policy separately, or fold into Privacy Policy? (TM doesn't strictly require; folding into Privacy is fine for MLP beta)
- Translation review: should TK + RU versions go through a separate legal review or is translating the EN version enough? (Likely separate review by TM lawyer)
- DMCA / IP infringement notice mechanism — needed for App Store? (US-style DMCA isn't required in TM; add a generic "report IP violation" flow in Phase 2)

## References

- [Feature 30 — Identity](../features/30-identity.md) — account deletion implementation
- [ADR-0022 — City-first listing location](../../adr/0022-city-first-listing-location.md) — city-level listing/search location policy
- [ADR-0023 — First-party product analytics](../../adr/0023-first-party-product-analytics.md) — no third-party analytics SDKs in the MLP beta
- [GRILL-OUTCOME §19](../../../GRILL-OUTCOME.md) — outstanding action item #7
