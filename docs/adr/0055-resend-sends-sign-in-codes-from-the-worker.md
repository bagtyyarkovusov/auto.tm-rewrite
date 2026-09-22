# ADR-0055: Resend sends sign-in codes by email from the worker

- **Status**: Accepted
- **Date**: 2026-09-22
- **Deciders**: AutoTM founder + AI architect
- **Complements**: [ADR-0054](0054-phone-or-email-sign-in-share-one-user.md), which requires this decision before any email-sending code ships. Adds an email provider to the outbound set of [ADR-0009](0009-notifications.md) and [ADR-0043](0043-native-apns-delivery-via-node-apn.md), under the hosting phases of [ADR-0039](0039-phased-cloud-first-hosting.md) and [ADR-0005](0005-hosting.md).

## Context

ADR-0054 lets a User sign in with a 6-digit code sent to their email. It sets the code limits (10-minute expiry, 5 requests per destination per 24 hours, 10 per IP per hour across both channels) and leaves the provider to this ADR. `CLAUDE.md` allows no new outbound dependency on a foreign service without an ADR. Today the only allowed outbound calls are FCM and APNS, sent from `apps/worker`.

[Compare email code delivery options for Railway now and TM later](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/349) found:

- Railway disables SMTP on its Free, Trial and Hobby plans and points to HTTPS email APIs, with Resend first.
- Resend's Free plan (3,000 emails a month, 100 a day) covers the reviewer phase at no cost. It needs no sandbox review.
- Amazon SES is cheaper at volume and documents how to send through a proxy, but it needs an AWS account, IAM setup and a sandbox review that can take a day or more.
- The old backend's personal Gmail with an app password is a legacy path, capped at about 500 a day, and can't use our domain for SPF, DKIM or DMARC.
- There's no published data on whether mail reaches Turkmenistan-hosted inboxes.

Resend's docs say:

- The Node SDK calls the API with the global `fetch`. It has a `baseUrl` option but no proxy or agent option.
- `emails.send` accepts an idempotency key.
- Open and click tracking are off by default.
- Hard bounces and complaints are added to an account-wide suppression list automatically, and sends to those addresses are skipped. Gmail doesn't report complaints.
- Account data, metadata and logs are stored in the US and kept for 30 days, whichever sending region is chosen.

The founder chose `autotm.bagtyyar.dev` (DNS at Namecheap) as the sending domain for the Railway phase. `*.up.railway.app` can't be used, because we can't add DNS records to it.

## Decision

**`apps/worker` sends sign-in code emails through Resend's HTTPS API. Amazon SES is the fallback provider. No other process sends email, and no process uses SMTP.**

### Sending path

- The API validates and stores the code as ADR-0054 describes, then puts an `email-code` job on a BullMQ queue. It doesn't wait for delivery.
- The worker renders the email and calls Resend through an `EmailSenderPort` adapter. A mock adapter is used in tests and on localhost, like `SMS_DRIVER=mock`.
- Each send uses the job ID as its idempotency key, so a retried job never sends a second email.
- A send that Resend rejects or suppresses fails permanently. The worker logs it and doesn't retry.
- SES is the named fallback. Its adapter is built only if Resend becomes unusable. Switching providers changes the adapter, never the port or the queue.

### Sender and message

- Production sends from `AutoTM <no-reply@autotm.bagtyyar.dev>`. Staging sends from `staging.autotm.bagtyyar.dev`, with its own API key. Both move to the production domain at the TM cutover.
- The message names only AutoTM. It's in the User's locale (RU, TK or EN), has a plain-text part and no links, puts the code in the subject, states the 10-minute expiry, and says AutoTM will never ask for the code. There's no reply-to address.
- Open and click tracking stay off.

### Domain authentication

- Each sending subdomain publishes the DKIM and bounce-domain records shown in Resend's dashboard. That gives aligned SPF and DKIM.
- DMARC starts at `p=none`, with aggregate reports sent to a mailbox the founder owns. It moves to `p=quarantine` after 30 days of reports showing only aligned, passing mail, and before the TM cutover at the latest.

### Limits and cost

- The ADR-0054 limits apply to every destination, including reserved reviewer emails. No exemption.
- The reviewer phase uses Resend's Free plan. The worker stops sending at 80 emails per UTC day across all environments and raises an alert. That leaves room under Resend's 100-a-day cap.
- AutoTM moves to Resend Pro before the public launch, or as soon as the daily cap is reached, whichever comes first. The worker cap is then raised to match.
- Bounces and complaints rely on Resend's suppression list. There's no webhook, because the TM topology has no inbound path from Resend.

### Secrets

- `RESEND_API_KEY` is a sending-only key, one per environment. It's set only on the worker service in Railway's variables. It never appears in git, issues, logs or the API service.

### Data and privacy

- Resend processes the recipient address and the message, which contains the code. It stores them in the US for 30 days. The founder accepts Resend's DPA before the first real send.
- The privacy policy names an email delivery provider in the US as a processor of email addresses.
- The Google Play Data safety form declares: Personal info → Email address, collected, not shared, not processed ephemerally, optional, for App functionality and Account management, encrypted in transit, deletable.

### TM era

- The worker reaches `api.resend.com` through the TM Proxy PC, which allows only CONNECT to that host on port 443. It sends directly only if a recorded probe from the TM VM provider shows that 443 to Resend works, as was done for FCM and APNS.
- The proxy is configured once, as the process-wide `fetch` dispatcher. The port, queue and templates don't change. Before cutover, a test send through the proxy must pass.
- Email sign-in in the TM era is best-effort, limited by the Proxy PC's availability. Phone codes through the in-country SMS gateway stay the primary sign-in path.
- Before the TM launch, test sends go to real sanly.tm and online.tm addresses, and to a Gmail and a Mail.ru inbox read from Turkmenistan. The SPF, DKIM and DMARC results and whether each message reached the inbox are recorded in an ops doc. If TM-hosted inboxes don't receive the mail, the launch goes ahead and email sign-in is stated as best-effort for those domains.

## Consequences

### Positive

- One API key and a few DNS records get email sign-in working on every Railway plan at no cost for the reviewer phase.
- Outbound calls stay in one process, like push, so the TM proxy has one client to configure and one host to allow.
- The port and the mock adapter keep provider details out of identity and out of tests.

### Negative / accepted costs

- Recipient addresses and codes sit with a US provider for 30 days.
- The Free plan's 100-a-day cap can stop email sign-in on a busy review day. The worker cap and alert make that visible. They don't prevent it.
- Without webhooks, AutoTM doesn't record bounces itself. Suppressed addresses fail silently for the User beyond "code not received".
- In the TM era, email sign-in depends on a personal computer with VPN and a UPS.
- Delivery to Turkmenistan-hosted mail is unproven until the test sends.

### Neutral

- `CLAUDE.md`'s list of allowed outbound providers adds this ADR next to ADR-0009 and ADR-0043.
- `apps/worker/CONTEXT.md` and `apps/api/src/modules/identity/CONTEXT.md` change when the sending code ships, not before (ADR-0019).

## Alternatives considered

- **Amazon SES as primary.** Rejected for now: AWS account, IAM and sandbox review take time before store review, for a saving that doesn't matter at beta volume. Kept as the fallback.
- **Postmark.** Rejected: no advantage over Resend at beta volume, and $15 a month from day one.
- **SMTP through a provider relay.** Rejected: blocked on Railway plans below Pro, and many proxies don't allow CONNECT to SMTP ports.
- **A self-hosted mail server.** Rejected: needs reverse DNS, port 25 and building sender reputation, none of which works on Railway or from TM.
- **Personal Gmail or Workspace SMTP.** Rejected: legacy app passwords, daily lockouts, no domain alignment.
- **Sending from the API.** Rejected: it would add a second process with outbound calls and put delivery time on the request path.
- **Bounce webhooks.** Rejected: they need an inbound endpoint the TM topology can't expose. Resend's suppression list is enough at this volume.
- **Exempting reserved reviewer emails from code limits.** Rejected by the founder: reviewers use the same limits as everyone else.

## References

- [ADR-0005](0005-hosting.md), [ADR-0009](0009-notifications.md), [ADR-0039](0039-phased-cloud-first-hosting.md), [ADR-0043](0043-native-apns-delivery-via-node-apn.md), [ADR-0054](0054-phone-or-email-sign-in-share-one-user.md)
- [ADR-0019](0019-context-md-describes-current-state.md), [ADR-0020](0020-document-hierarchy-and-mutability.md)
- [Decide the email provider ADR for sign-in codes](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/376)
- [Compare email code delivery options for Railway now and TM later](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/349) and its findings on the `research/email-code-delivery` branch
- [Identity PRD](../prd/features/30-identity.md)
- Resend docs, via Context7 (`/resend/resend-node`, `/websites/resend`), 2026-09-22: client options, idempotency keys, domain tracking, suppression list
- [Railway, Outbound Networking](https://docs.railway.com/reference/outbound-networking)
