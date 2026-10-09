# ADR-0093: Carberk is the public product name

- **Status**: Accepted
- **Date**: 2026-10-09
- **Deciders**: Founder, in the release session of 2026-10-09

## Context

Another app named "awtotm" appeared shortly before the first store release. Its name is close enough to AutoTM to confuse buyers and sellers. The founder decided to rename the product before the release instead of after it.

The store release updates the existing Play app `com.auto_tm.ynamly`, whose package can never change ([#697](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/697)). The product also runs on `autotm.bagtyyar.dev` and has no new domain yet.

## Decision

The product's public name is **Carberk**. Its parent company is **Alpha Motors**.

1. **Everything a user or a store reviewer reads says Carberk.** This covers the app name, icon, launch screen, in-app text in English, Russian and Turkmen, sign-in email, SMS text, the public web pages, the legal pages, the admin title and the Play store listing.
2. **Internal identifiers keep their names.** The Play package `com.auto_tm.ynamly`, the bundle id `tm.auto.app`, the `autotm://` link scheme, the `@auto-tm/*` packages, the Expo slug, environment variable names, cookie names, the Railway project and the repository are unchanged. Renaming them would break installs, sessions or deployments and no user sees them.
3. **Domains stay until after the release.** Web, API, media and email keep `autotm.bagtyyar.dev`, and universal links keep `auto.tm`. A domain move is a separate later decision.
4. **The logo is the wordmark "carberk."** It is set in Poppins ExtraBold (SIL Open Font License), lowercase, with a round dot. The app icon is its first letter and the dot, "c.", white on brand red `#E60000`. Assets and rules are in [the brand folder](../prd/ops/brand/README.md).
5. **Alpha Motors appears as a small endorsement**, "by Alpha Motors", on the About screen, the web home page, the store description and the feature graphic. Turkmen text uses the parent company's line "Alpha Motors bilen arzan däl-de, amatly ulag satyn al."
6. **Sentences write "Carberk"**; only the logo is lowercase.

## Consequences

- The contact-phone SMS texts of [ADR-0081](0081-contact-phone-confirmation-api-for-listings.md) change their first word. The Russian text also changes "покажут" to "будет" so that it still fits one 70-character segment (now 69). Turkmen is 67 characters and English 82.
- The sender name of sign-in email comes from the `EMAIL_FROM` variable of each environment, so it changes at promotion, not with this code.
- New admin authenticator enrolments show "Carberk Admin". Existing enrolments keep working and keep their old label.
- Earlier ADRs, plans, evidence and domain documents still say AutoTM. They are history and are not rewritten. New documents use Carberk for the product and may keep "AutoTM" only for the internal identifiers listed above.
- The name has had a web search but no trademark clearance. No registered-mark symbol is used.
