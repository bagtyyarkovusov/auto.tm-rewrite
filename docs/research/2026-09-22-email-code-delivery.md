# Email sign-in code delivery: Railway now, TM later

- **Date**: 2026-09-22 (every external source below was accessed on this date)
- **Question**: Which email delivery option should send sign-in codes during the Railway phase ([ADR-0039](../adr/0039-phased-cloud-first-hosting.md)), and how does it carry over to the air-gapped TM phase ([ADR-0005](../adr/0005-hosting.md))?
- **Feeds**: the ADR that CLAUDE.md requires for any new outbound dependency ("NEVER add a new outbound dependency on a foreign service without an ADR").
- **Status**: research only. No decision is recorded here.

## TL;DR recommendation

1. **Railway phase: use a transactional email provider over its HTTPS API. Do not use SMTP.** Railway blocks SMTP on Free, Trial and Hobby plans and points users to HTTPS email APIs, naming Resend as "Railway's recommended approach" ([Railway, Outbound Networking](https://docs.railway.com/reference/outbound-networking)). An HTTPS API works on every Railway plan. It also fits a TM forward proxy later, which SMTP does not.
2. **Default pick: Resend.** It is the lowest-effort official path. Railway's docs recommend it, the free tier (3,000 emails/month, 100/day) covers beta volume at $0 ([Resend pricing](https://resend.com/pricing)), there is no sandbox approval step, and the official `resend` npm SDK is small. Resend sends through AWS: AWS appears on its subprocessor list as "Third party hosting and sending provider" ([Resend subprocessors](https://resend.com/legal/subprocessors)).
3. **Named fallback and TM-era candidate: Amazon SES (API v2, `@aws-sdk/client-sesv2`).** It is the cheapest at volume ($0.10 per 1,000 à la carte, [SES pricing](https://aws.amazon.com/ses/pricing/)) and AWS documents how to send its SDK through an HTTP(S) proxy ([AWS SDK v3 proxies](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-configuring-proxies.html)). It costs more setup time: sandbox exit review with a first response "within 24 hours" ([SES production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)), plus IAM.
4. **Architecture: `apps/worker` sends and `apps/api` enqueues.** This matches the existing egress rule, under which FCM/APNS go out from `apps/worker` only (CLAUDE.md; [ADR-0043](../adr/0043-native-apns-delivery-via-node-apn.md)). The API writes a BullMQ job, the same pattern as `notification-fanout`, and the worker calls an `EmailSenderPort` adapter. In the TM era the adapter's HTTPS call goes through the TM Proxy PC's forward proxy.
5. **Rejected:** personal Gmail plus app password (what we did before). Also rejected: Google Workspace SMTP relay, and any self-hosted MTA in either phase.
6. **Hard prerequisite:** email needs a sending domain we control in DNS. ADR-0039 says `auto.tm` is not registered yet. Email sign-in cannot ship before the domain exists.

## Comparison table

Prices come from official pricing pages checked on 2026-09-22. "Beta" means under 1,000 emails/month, "later" means about 10,000/month.

| | Resend (HTTPS API) | Amazon SES (HTTPS API v2) | Postmark (HTTPS API) | Provider SMTP relay (SES/Postmark SMTP via nodemailer) | Self-hosted MTA (Postfix/Stalwart) | Gmail / Workspace SMTP (prior art) |
|---|---|---|---|---|---|---|
| Works on Railway Hobby | Yes (443) | Yes (443) | Yes (443) | **No**: SMTP disabled below Pro | **No**: SMTP disabled below Pro | **No**: SMTP disabled below Pro |
| Cost, beta | $0 (Free: 3,000/mo, 100/day) | about $0.10 (à la carte $0.10/1k; new-customer credits) | $15/mo (Free is only 100/mo) | Same as the provider's API price, plus Railway Pro | VM plus ops time; deliverability is the real cost | $0 personal; Workspace seat otherwise |
| Cost, 10k/mo | $20/mo (Pro, 50k included) | about $1.00 | $15/mo (Basic, 10k included) | As left | As left | Personal limit is about 500/day |
| Official Node SDK | `resend` (6.28.1) | `@aws-sdk/client-sesv2` (3.1136.0) | `postmark` (5.1.0) | `nodemailer` (10.0.10) | `nodemailer` to local MTA | `nodemailer` |
| SPF/DKIM/DMARC alignment on our domain | Yes (DKIM TXT plus `send` subdomain records) | Yes (Easy DKIM plus custom MAIL FROM) | Yes (DKIM TXT plus Return-Path CNAME) | Same as provider | We run everything, including PTR | No (From is @gmail.com) |
| Data location | US for all account data; send region selectable | Chosen AWS region (retention unverified) | US | Same as provider | Ours | Google |
| Content retention at provider | 30 days, all plans | Not published (unverified) | 45 days default, 7 to 365 with add-on | Same as provider | Ours | Mailbox "Sent" folder |
| TM-era path | HTTPS via Proxy PC forward proxy | HTTPS via Proxy PC forward proxy (documented SDK proxy support) | HTTPS via Proxy PC forward proxy | SMTP via HTTP CONNECT proxy (nodemailer `proxy`) if the proxy allows 587 | Needs outbound 25 from TM plus reputation; not viable | Not viable |
| Setup effort | Lowest | Medium (AWS account, IAM, sandbox review) | Low | Medium | Highest | Low, but wrong |

SDK versions are the `latest` dist-tags from the npm registry (`registry.npmjs.org/<pkg>/latest`), queried 2026-09-22. Repositories: [resend/resend-node](https://github.com/resend/resend-node), [aws/aws-sdk-js-v3](https://github.com/aws/aws-sdk-js-v3), [ActiveCampaign/postmark.js](https://github.com/ActiveCampaign/postmark.js) ("Official Node.js client library for the Postmark HTTP API"), [nodemailer/nodemailer](https://github.com/nodemailer/nodemailer).

## Inbox requirements that apply to every option

**Gmail.** All senders must "Set up SPF or DKIM email authentication for your sending domains", need valid forward and reverse DNS (PTR) for sending IPs, must use TLS, and must keep the spam rate reported in Postmaster Tools below 0.3%. Senders of 5,000 or more messages a day to Gmail must also publish DMARC (policy may be `none`) and align the From: domain with the SPF or DKIM domain. One-click unsubscribe applies to marketing and subscribed messages, not transactional ones ([Google, Email sender guidelines](https://support.google.com/a/answer/81126)).

**Yahoo.** Same shape. All senders need SPF or DKIM and a spam rate below 0.3%. Bulk senders need SPF and DKIM, DMARC at `p=none` or stricter with alignment, and one-click list-unsubscribe for marketing ([Yahoo Sender Hub, best practices](https://senders.yahooinc.com/best-practices/)).

**Outlook.com (Microsoft consumer).** Domains sending 5,000 or more messages to Microsoft consumer mailboxes must pass SPF and DKIM and publish DMARC at `p=none` or stricter, aligned with SPF or DKIM. Non-compliant mail is rejected with `550; 5.7.515` ([Microsoft Defender for Office 365 blog, Outlook's new requirements for high-volume senders](https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730)).

**What this means for AutoTM.** At beta and 10k/month volume we are nowhere near the 5,000/day bulk threshold. Even so, set up SPF, DKIM and DMARC with alignment from day one. It costs nothing, it is required the moment volume grows, and an OTP email that lands in spam is a failed sign-in. Every hosted provider above supplies DKIM plus a custom bounce domain, so aligned DKIM and SPF are available. Self-hosting is the only option where PTR and IP reputation become our problem.

**Turkmenistan-hosted mailboxes (Sanly.tm, Turkmentelecom mail, online.tm).** **No primary facts found.** I found no published sender requirements, postmaster pages, or blocklist policies from Turkmentelecom or Sanly. The only sources confirming that Sanly.tm and Turkmentelecom corporate mail exist are news items (Turkmenportal), which are not primary. Whether mail from AWS/Resend/Postmark IP ranges reaches TM-hosted mailboxes is **unverified**. It needs an empirical test: send to real sanly.tm and online.tm addresses from the chosen provider and read the headers. The same applies in reverse: whether TM users read mail on Gmail/Mail.ru versus TM providers is a product fact we do not have.

## Option details

### A. Resend (HTTPS API)

- **Railway**: Railway's recommended approach for email ([Railway](https://docs.railway.com/reference/outbound-networking)).
- **Pricing** ([resend.com/pricing](https://resend.com/pricing)): Free is $0 for 3,000 emails/month, 100/day, 3 domains. Pro is $20/month for 50,000 emails with no daily limit, overage $0.90 per 1,000. Hitting the free 100/day cap is the only beta risk: a review day with retries could approach it.
- **Limits** ([account quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits)): 10 requests/second per team; 30-day retention of email data on all plans.
- **DNS** ([domain troubleshooting](https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying)): DKIM TXT at `resend._domainkey`. For SPF and bounces, older domains use MX plus TXT on the `send` subdomain (MX value like `feedback-smtp.<region>.amazonses.com`). Domains created after August 2026 get CNAMEs on `send` and `rsend`. The dashboard shows the exact set. A custom Return-Path subdomain is optional ([domains intro](https://resend.com/docs/dashboard/domains/introduction)).
- **Regions** ([regions](https://resend.com/docs/dashboard/domains/regions)): send from us-east-1, eu-west-1, sa-east-1 or ap-northeast-1. However, "All account data, including email metadata, logs, and API records, is stored in the United States regardless of the sending region you select."
- **Data processed**: recipient address, subject and body (which contains the OTP code), metadata and logs, kept 30 days in the US. Subprocessors are all US-based, including AWS for sending ([subprocessors](https://resend.com/legal/subprocessors)).
- **Node**: `resend` package; `new Resend(apiKey).emails.send({ from, to, subject, html, text })`.
- **TM era**: HTTPS to `api.resend.com` through the Proxy PC. Proxy support: the Resend SDK's HTTP client and its proxy configuration are **unverified** (the npm page returned 403 to the fetcher, and I found no proxy section in Resend docs). The fallback is Node's global dispatcher proxy or a thin `fetch` call we own.

### B. Amazon SES (HTTPS API v2)

- **Pricing** ([aws.amazon.com/ses/pricing](https://aws.amazon.com/ses/pricing/)): à la carte $0.10 per 1,000 outbound emails with no monthly minimum. The page also lists plans: Essentials at $0.16/1k, Pro at $0.22/1k plus $105/month, Enterprise at $0.23/1k plus $500/month. New customers get "up to $200 in AWS Free Tier credits" for 6 months. Attachments are $0.12/GB (not relevant here).
- **Sandbox** ([production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)): new accounts can only send to verified addresses, at most 200 messages per 24 hours and 1 per second. The sandbox is per region. The production-access request (choose "Transactional") gets a first response within 24 hours and may take longer. This review is the main setup friction and a schedule risk before store review.
- **DNS**: Easy DKIM uses a 2048-bit key by default and publishes CNAMEs, which Route 53 can create automatically ([Easy DKIM](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim-easy.html)). For SPF alignment, a custom MAIL FROM subdomain needs exactly one `MX 10 feedback-smtp.<region>.amazonses.com` and `TXT "v=spf1 include:amazonses.com ~all"`. It must not be a subdomain used to send or receive mail ([custom MAIL FROM](https://docs.aws.amazon.com/ses/latest/dg/mail-from.html)).
- **Data processed**: AWS says it "or third-party providers may store and scan SES email and content" for spam, phishing and malware (per [SES FAQ](https://aws.amazon.com/ses/faqs/) as surfaced in search; exact retention period **unverified**). AWS requires TLS 1.2 to its APIs, and delivery to receivers uses opportunistic TLS by default, configurable to required ([SES data protection](https://docs.aws.amazon.com/ses/latest/dg/data-protection.html)). Data lives in the region we choose.
- **Node**: `@aws-sdk/client-sesv2`, `SendEmailCommand`. The SDK takes a proxy agent via `NodeHttpHandler({ httpAgent, httpsAgent })` ([AWS SDK v3 proxies](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-configuring-proxies.html)). This is the best-documented TM proxy path of the three APIs.

### C. Postmark (HTTPS API)

- **Pricing** ([postmarkapp.com/pricing](https://postmarkapp.com/pricing)): the Free developer tier is only 100 emails/month, which is too small once testers join. Basic is $15/month for 10,000 emails, overage $1.80 per 1,000.
- **DNS** ([verify a domain](https://postmarkapp.com/support/article/1046-how-do-i-verify-a-domain)): a DKIM TXT record plus a Return-Path CNAME to `pm.mtasv.net`, which gives SPF alignment. DMARC is recommended.
- **Data processed**: activity and content are kept 45 days by default, adjustable from 7 to 365 days with the Retention Add-on ([retention add-on](https://postmarkapp.com/support/article/how-does-the-retention-add-on-work)). Data is stored in the US at Deft (near Chicago) and AWS ([GDPR FAQ](https://postmarkapp.com/support/article/1218-gdpr-faq), [security](https://postmarkapp.com/security)).
- **SMTP option**: `smtp.postmarkapp.com` on ports 25, 2525 or 587 with STARTTLS ([Postmark SMTP](https://postmarkapp.com/developer/user-guide/send-email-with-smtp)).
- **Node**: `postmark` (`ServerClient#sendEmail`).
- **Verdict**: a sound product, but it offers nothing over Resend at beta volume and costs $15/month from day one.

### D. SMTP relayed through a provider (nodemailer to SES/Postmark SMTP)

- **Railway**: "SMTP is disabled on these plans to prevent spam and abuse" (Free, Trial, Hobby). It works only on Pro and above, after a redeploy. Railway's debugging guide checks ports 25, 465, 587 and 2525 ([Railway](https://docs.railway.com/reference/outbound-networking)). **This decides the Railway phase:** SMTP ties us to a plan tier for no benefit.
- **SES SMTP**: STARTTLS on 25, 587 or 2587; TLS wrapper on 465 or 2465; TLS is mandatory ([SES SMTP](https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html)).
- **TM era**: nodemailer supports HTTP CONNECT proxies natively (`proxy: "http://..."`) and SOCKS via the `socks` module ([nodemailer proxies](https://nodemailer.com/smtp/proxies)). This works only if the Proxy PC's forward proxy allows CONNECT to port 587/465. Many proxies restrict CONNECT to 443 by default, so it is one more thing to configure and one more thing a TM firewall can block. The only real advantage of SMTP is provider portability through a single `nodemailer` transport.

### E. Self-hosted mail server (Postfix / Stalwart / Mailcow-style)

- **Railway phase**: blocked on Hobby (SMTP disabled). On Pro, whether Railway lets us set a PTR (reverse DNS) record for its egress IPs is **unverified**. Railway documents static outbound IPs for Pro, but I found nothing on PTR ([Railway](https://docs.railway.com/reference/outbound-networking)). Gmail and Yahoo require valid forward and reverse DNS for sending IPs (sources above), so without PTR control this fails at the first requirement.
- **TM phase**: direct-to-MX delivery needs outbound TCP 25 from a TM VM to Gmail/Outlook MX hosts. ADR-0005 states that TM VMs cannot reach foreign servers reliably. Even if port 25 were open, a fresh TM IP has no sending reputation and we would own blocklist monitoring, DKIM key rotation and bounce processing.
- **Where a local MTA does make sense later**: as a **relay only**. A TM-side Postfix/Stalwart would accept mail from the worker and forward it through a provider's authenticated SMTP ("smarthost"). Stalwart documents relaying "through designated hosts" ([Stalwart outbound](https://stalw.art/docs/mta/outbound/)). It still needs egress to the provider, so it does not remove the Proxy PC dependency. Its value is local queuing and retry. BullMQ in the worker already provides that.

## DNS setup checklist (on the AutoTM sending domain)

Assumes `auto.tm` (or its fallback) is registered, with DNS at a registrar reachable from outside TM as ADR-0005 requires. Use a dedicated subdomain for app mail, for example `mail.auto.tm` as the From domain, so a reputation problem cannot touch the apex.

1. **SPF** ([RFC 7208](https://www.rfc-editor.org/rfc/rfc7208)): do not add the provider to the apex SPF unless the provider tells you to. Resend, SES (custom MAIL FROM) and Postmark (Return-Path) each put SPF on a **bounce subdomain** they own the MX for. Keep at most one SPF TXT record per name; RFC 7208 treats multiple records as a permerror.
2. **DKIM** ([RFC 6376](https://www.rfc-editor.org/rfc/rfc6376)): publish the provider's selector records: Resend `resend._domainkey` TXT, SES 3 Easy DKIM CNAMEs, Postmark DKIM TXT. Prefer 2048-bit keys.
3. **Return-Path / custom MAIL FROM**: Resend `send` subdomain (MX+TXT or CNAMEs), SES `bounce.mail.auto.tm` MX+TXT, Postmark `pm-bounces` CNAME to `pm.mtasv.net`. This gives SPF alignment in addition to DKIM alignment.
4. **DMARC** ([RFC 7489](https://www.rfc-editor.org/rfc/rfc7489)): `_dmarc.auto.tm TXT "v=DMARC1; p=none; rua=mailto:<reports mailbox>"` to start. Move to `p=quarantine` once reports show only aligned, passing mail. Relaxed alignment (the default) lets `mail.auto.tm` or `bounce.mail.auto.tm` align with `auto.tm`.
5. **PTR**: handled by the provider for all hosted options. Our problem only when self-hosting.
6. **Mailbox for replies and DMARC reports**: we need somewhere that receives mail (`rua`, a reply-to or support address). This needs inbound MX on some domain. It is a separate decision and also needed for the privacy contact in `docs/prd/ops/83-legal.md`.
7. **Verify**: send to Gmail, Outlook.com and Yahoo test inboxes and check `Authentication-Results` for `spf=pass`, `dkim=pass` and `dmarc=pass` with our domain. Repeat for a sanly.tm / online.tm address if one is available (see the TM gap above).

## Google Play Data safety wording

Definitions from [Play Console Help, Data safety](https://support.google.com/googleplay/android-developer/answer/10787469):

- **Collected**: "Transmitting data from your app off a user's device". The user types an email address and the app sends it to our API, so **Email address** (Personal info) is **collected**.
- **Shared**: "Transferring user data collected from your app to a third party". But a **service provider**, "An entity that processes user data on behalf of the developer and based on the developer's instructions", is exempt. The email provider processes the address and message only to deliver our code, under our instructions and its DPA, so sending through Resend/SES/Postmark is **not "shared"**. This holds only while we do not let the provider use the data for its own purposes. Open/click tracking should stay **off**: it adds nothing to OTP mail and weakens the "on our instructions only" position.
- **Ephemeral processing exemption**: applies only to data held in memory and "retained no longer than necessary" for a real-time request. It does **not** apply: we would store the address (on `User` and/or an OTP request row) and the provider keeps it 30 to 45 days.
- **Purposes**: **App functionality** ("enable app features, or authenticate users") and **Account management** ("setup or management of a user's account … credential verification"). Not Advertising, Analytics or Marketing.
- **Optional vs required**: if phone OTP stays available as an alternative, email is **optional** for sign-in. Selling still requires a verified phone per the founder's release scope.
- **Suggested row**: Personal info → Email address → Collected: Yes; Shared: No; Processed ephemerally: No; Required: No (optional); Purposes: App functionality, Account management. Also: encrypted in transit: Yes; users can request deletion: Yes (existing `DELETE /api/v1/me` flow; the purge job must also clear the email field once one exists).
- The privacy policy (`apps/web` legal pages) should name the email processor category and its US location. That is a text change to track in the ADR follow-ups.

## TM-phase carry-over

ADR-0005: "No outbound calls from API or worker. External integrations (VIN decoder, future maps) route through TM Proxy PC." FCM/APNS are the documented exception ("verified reachable from TM VM provider"). Email has no such verification.

Plan, in order of preference:

1. **Worker to Proxy PC forward proxy to provider HTTPS API (recommended).** The worker's email adapter reads an `EMAIL_HTTPS_PROXY` (or standard `HTTPS_PROXY`) variable. The Proxy PC runs a forward proxy limited to CONNECT on 443 to an allowlist (`api.resend.com` or `email.<region>.amazonaws.com`). Only the adapter's HTTP client changes; the port, queue and templates stay as they are. SES has a documented proxy recipe. For Resend, either confirm the SDK honours a custom agent or dispatcher, or call its REST endpoint through our own proxied `fetch`.
2. **Worker to TM-side relay MTA to provider SMTP via Proxy PC.** More moving parts. Its only benefit is survivability if the provider changes. Not recommended unless 1 fails.
3. **Direct from TM VM**: only if a probe proves 443 to the provider is reachable from the TM VM provider, as was done for FCM/APNS. Record that probe in the ADR as evidence, never as an assumption.

**Single point of failure:** ADR-0005 describes the Proxy PC as a personal computer with VPN, Wi-Fi and a UPS. If email sign-in becomes a primary login path in the TM era, its availability is capped by that box. The ADR should state that TM-era email sign-in is **best-effort** and that phone OTP through the in-country SMS gateway stays the primary path. Alternatively it should require a second egress path.

**Railway stays staging after cutover** (ADR-0039). The same provider account can keep serving staging with a separate API key and sending subdomain, for example `staging-mail.auto.tm`.

## Prior art: what we did before and why not to repeat it

`/Users/bagtyyar/Projects/auto.tm-main/backend/src/mail/mail.service.ts` used `nodemailer.createTransport({ service: "gmail", auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD } })`, a personal Gmail account with an app password. It called `transporter.verify()` on every send and used an HTML template whose subject named "Alpha Motors Dubai" and whose body referred to a Microsoft account (`учетной записи Майкрософт`).

Why not to repeat it:

- **App passwords are a legacy path by Google's own description.** "App passwords aren't recommended and are unnecessary in most cases". They require 2-Step Verification and are revoked whenever the main password changes ([Google Account Help, app passwords](https://support.google.com/accounts/answer/185833)). A routine password change silently breaks sign-in for every user.
- **Password-only access is gone for Workspace.** Google turned off less-secure-app (password-only) access for Workspace accounts, finally from May 1, 2025, including SMTP ([Workspace Updates](https://workspaceupdates.googleblog.com/2023/09/winding-down-google-sync-and-less-secure-apps-support.html); [Transition from less secure apps to OAuth](https://support.google.com/a/answer/14114704)).
- **Sending limits.** Personal Gmail limits are around 500 emails a day, after which sending is blocked for 1 to 24 hours ([Gmail Help, sending limits](https://support.google.com/mail/answer/22839)). Paid Workspace allows 2,000 messages a day per user and trial accounts 500; exceeding the limit blocks sending for up to 24 hours ([Workspace sending limits](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace)). A lockout on review day means no sign-in.
- **No domain authentication.** Mail comes From `@gmail.com`, so we cannot align SPF, DKIM or DMARC to an AutoTM domain, and recipients see a personal address, not the brand.
- **Workspace SMTP relay is the "official" Google path for apps, but it is the wrong fit.** It is meant for "on-premise devices and applications that generate outbound email", with 10,000 messages per user per 24 hours, IP allowlist or SMTP AUTH, and ports 25/465/587 ([Workspace SMTP relay](https://knowledge.workspace.google.com/admin/gmail/advanced/route-outgoing-smtp-relay-messages-through-google)). It is SMTP (blocked on Railway Hobby), it requires paying for Workspace, and an IP allowlist does not fit Railway's shared egress without Pro static IPs.
- **The template looked like phishing.** A code email that names another brand (Microsoft) and an unrelated company (Alpha Motors Dubai) teaches users to trust mismatched senders. Spam filters also weigh brand and sender mismatch. The new template must:
  - name only AutoTM;
  - come From `AutoTM <no-reply@mail.auto.tm>`;
  - be in the user's locale (RU/TK/EN);
  - put the code in the subject or preheader;
  - state the 5-minute expiry (matching `OtpRequest`);
  - say "we will never ask for this code";
  - contain no links (a code-only email has nothing to click);
  - have a plain-text part.
- **Other code issues:** credentials in a generic `EMAIL_PASSWORD`, `verify()` on every send (an extra SMTP round-trip) and `console.error` instead of structured logging. The new design puts the send behind a port with a test adapter, like `SMS_DRIVER=mock`.

**The "official, easier way":** for this stack, that is Railway's own recommendation, a provider with an HTTPS API (Resend first in Railway's list). It takes one API key and DNS records copied from the provider dashboard. **No Railway-native email service or first-party template was found** in Railway's networking docs; they point only to third-party providers (**unverified** beyond that page). SES is the "official AWS" path: also HTTPS, cheaper at scale, with more setup.

## Repo fit (current state)

- `apps/api/src/modules/identity/domain/ports/OtpSenderPort.ts` is `send(phone, code)`, phone-specific. Email needs either a separate `EmailCodeSenderPort` or a channel-typed sender. The identity CONTEXT says "Email is optional and not used for login", but the listed `User` columns do not include an email field. Email sign-in is a domain invariant change and needs a CONTEXT.md update, a Prisma migration and probably an ADR amendment to the phone-only identity model.
- `OtpRequest` is keyed by `phone`. Rate limits (5 per phone per 24h, 10 per IP per hour) and backoff need an email equivalent, or email OTP becomes an enumeration and spam vector (including a bill-running vector at $0.90 to $1.80 per 1,000 over quota).
- The worker already runs BullMQ processors (`apps/worker/src/queues/*.processor.ts`) and the API already produces jobs (`BullMqPushQueueProducer`), so an `email-otp` queue follows the existing pattern. The API response should not wait on provider delivery beyond the enqueue. The 5-minute expiry leaves room for a few retries.
- `ReviewerOtpBypass` is phone-based. Decide whether reviewers use email codes (real delivery) or keep phone demo accounts.

## Open questions for the ADR

1. **Provider**: Resend (recommended, lowest effort) or SES (cheapest, best-documented proxy)? Record the other as the fallback adapter.
2. **Transport**: HTTPS API only. Explicitly forbid SMTP from Railway and TM VMs.
3. **Egress owner**: `apps/worker` only (API enqueues). This extends the sanctioned egress set in CLAUDE.md from {FCM, APNS} to {FCM, APNS, <email provider>}.
4. **TM-era route**: Proxy PC forward proxy (CONNECT 443, allowlisted host), or a reachability probe proving direct 443 works, as done for FCM/APNS. Also, is TM-era email sign-in best-effort?
5. **Sending domain and records**: From address, subdomain split (prod vs staging), DMARC policy and when to tighten it, and who owns the `rua` mailbox.
6. **Data**: provider region and retention (Resend US and 30 days; SES region of choice), tracking off, DPA acceptance, privacy-policy text, and the Data safety row above.
7. **Identity model**: `User.email` (unique? verified-at?), email OTP storage and rate limits, account linking between email and phone identities, and the purge job clearing email.
8. **Abuse and cost caps**: per-email and per-IP limits, a provider hard cap or alerting (Resend has a 5x-quota hard limit per its quotas page), and bounce/complaint handling (suppress hard-bounced addresses).
9. **TM inbox reachability**: a test plan against sanly.tm / online.tm addresses before TM launch. No primary data exists today.
10. **Prerequisite**: domain registration (ADR-0039 hard deadline) comes before any email work.

## Sources

All accessed 2026-09-22.

- Railway, Outbound Networking: https://docs.railway.com/reference/outbound-networking
- Google, Email sender guidelines: https://support.google.com/a/answer/81126
- Yahoo Sender Hub, Best practices: https://senders.yahooinc.com/best-practices/
- Microsoft Defender for Office 365 blog, Outlook requirements for high-volume senders: https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730
- RFC 7208 (SPF): https://www.rfc-editor.org/rfc/rfc7208
- RFC 6376 (DKIM): https://www.rfc-editor.org/rfc/rfc6376
- RFC 7489 (DMARC): https://www.rfc-editor.org/rfc/rfc7489
- Google Play Console Help, Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Resend pricing: https://resend.com/pricing
- Resend quotas and limits: https://resend.com/docs/knowledge-base/account-quotas-and-limits
- Resend domains: https://resend.com/docs/dashboard/domains/introduction
- Resend domain verification records: https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying
- Resend regions: https://resend.com/docs/dashboard/domains/regions
- Resend subprocessors: https://resend.com/legal/subprocessors
- Amazon SES pricing: https://aws.amazon.com/ses/pricing/
- Amazon SES production access (sandbox): https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- Amazon SES custom MAIL FROM: https://docs.aws.amazon.com/ses/latest/dg/mail-from.html
- Amazon SES Easy DKIM: https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim-easy.html
- Amazon SES SMTP endpoints: https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html
- Amazon SES data protection: https://docs.aws.amazon.com/ses/latest/dg/data-protection.html
- Amazon SES FAQ: https://aws.amazon.com/ses/faqs/
- AWS SDK for JavaScript v3, proxies: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-configuring-proxies.html
- Postmark pricing: https://postmarkapp.com/pricing
- Postmark domain verification: https://postmarkapp.com/support/article/1046-how-do-i-verify-a-domain
- Postmark SMTP: https://postmarkapp.com/developer/user-guide/send-email-with-smtp
- Postmark retention add-on: https://postmarkapp.com/support/article/how-does-the-retention-add-on-work
- Postmark GDPR FAQ / security: https://postmarkapp.com/support/article/1218-gdpr-faq, https://postmarkapp.com/security
- Nodemailer proxies: https://nodemailer.com/smtp/proxies
- Stalwart outbound: https://stalw.art/docs/mta/outbound/
- Google Account Help, app passwords: https://support.google.com/accounts/answer/185833
- Gmail Help, sending limits: https://support.google.com/mail/answer/22839
- Google Workspace sending limits: https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace
- Google Workspace SMTP relay: https://knowledge.workspace.google.com/admin/gmail/advanced/route-outgoing-smtp-relay-messages-through-google
- Google Workspace Updates, less secure apps wind-down: https://workspaceupdates.googleblog.com/2023/09/winding-down-google-sync-and-less-secure-apps-support.html
- Google Workspace Admin Help, transition from less secure apps: https://support.google.com/a/answer/14114704
- npm registry metadata: https://registry.npmjs.org/resend/latest, https://registry.npmjs.org/postmark/latest, https://registry.npmjs.org/@aws-sdk/client-sesv2/latest, https://registry.npmjs.org/nodemailer/latest
