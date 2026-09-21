# Research: lawful sources for car brand logo files

- **Date:** 2026-09-22
- **Ticket:** "Find a lawful source for car brand logo files"
- **Question:** Where can AutoTM get a logo image for every catalog brand, and what rights apply to using those files? Constraints: the Brand picker is a single-select list with a ~30 px icon beside each name, and every file must be served from AutoTM's own MinIO/S3 storage ([ADR-0008](../adr/0008-media.md), `MINIO_*` in `apps/api/.env.template`). No logo service at runtime.
- **Status:** research note, not a decision. An ADR is needed if we adopt it (it adds a bucket or prefix and a new Brand field).
- **Caveat:** this is not legal advice. Items marked **(counsel)** should go to a lawyer who knows Turkmen law.

---

## TL;DR

1. **No source gives us trademark rights.** Commons, Simple Icons and the scraped datasets all deal with copyright in the image file at most, and each of them says trademark clearance is the reuser's job. What we can control is (a) taking files whose copyright status is clean and written down, and (b) displaying them in a way that only identifies the maker.
2. **Easiest lawful route (recommended):**
   - **Simple Icons** (`simple-icons` npm, CC0-1.0, v16.32.0) covers **39 of our 130 brands** as ready-made monochrome 24×24 SVG paths.
   - **Wikimedia Commons**, one file at a time, fills the other passenger-car makes. Only take files tagged `{{PD-textlogo}}` / `{{PD-shape}}`. Most car-logo files we sampled carry that tag plus `{{Trademarked}}`.
   - A **generated letter mark** covers every other brand.
   - A one-off import script normalises each file into a monochrome master, rasterises it with Sharp, uploads it to MinIO under a versioned key, and writes a **provenance manifest** entry (source URL, licence, retrieval date, sha256).
3. **Do not use `filippofilip95/car-logos-dataset`**, even though it matches 77 of our slugs. The repo has **no LICENSE file**. The README claims MIT, but GitHub's licence API returns `null` and `/LICENSE` is a 404. The images were crawled from carlogos.org, whose terms forbid republishing its content without written permission and allow only personal, non-commercial browsing.
4. **Do not use manufacturer press kits.** The terms we could read say editorial use only, or require written permission (Toyota, BMW).
5. **Turkmen law has no explicit nominative-use exception.** The trademark law now in force is **Law No. 141-VI of 8 June 2019 "On Trademarks"**. It repealed the 2008 law named in the research brief (the ticket names no law). Art. 3(5) says nobody may use a protected mark without the owner's permission. The only limit on the owner's rights is national exhaustion in Art. 26(3). Showing a maker's logo next to its name to identify the cars is common marketplace practice, but it is a business risk, not a statutory safe harbour. **(counsel)**
6. **Google Play:** in-app use is governed by the IP and Impersonation policies ("confusing" or "falsely imply affiliation" uses are banned). **Store listing graphics are stricter:** third-party logos are not allowed "without proper permission". → **Use no brand logos in store screenshots or the feature graphic.** Capture them from a build or screen where the picker shows letter marks.
7. **Format:** one **monochrome alpha-mask PNG at 30/60/90 px** (1×/2×/3×), rendered with `expo-image` and `tintColor` set to the theme foreground. One asset then works in light and dark mode. The SVG master is kept in MinIO for later re-renders.

---

## 1. Brand tiering (from `packages/db/prisma/seed/brands.json`, 130 rows)

| Tier | What | Brands (seed `nameEn`) | Count | Logo policy |
|---|---|---|---|---|
| **A: must-have passenger makes** | Global makes that dominate TM listings | Toyota, Lexus, BMW, Mercedes-Benz, Hyundai, Genesis, Volkswagen, Chevrolet, Mazda, Infiniti, Nissan, Kia, Audi, Jeep, Ford, Mitsubishi, Chrysler, Volvo, Opel, Dodge, Honda, Peugeot, Citroen, Renault, Daewoo, Land Rover, Fiat, Skoda, Subaru, SsangYong, Buick, Alfa Romeo, Porsche, Daihatsu, Mini, Suzuki, Smart, GMC, Lincoln, Tesla, Seat, Jaguar, Cadillac, Isuzu, Saab, Pontiac, MG, Roewe, Saipa, Tofaş | ~50 | Real logo required |
| **B: Chinese makes** | Growing share, several are recent brands | Chery, Changan, Lifan, BYD, Brilliance, Geely, Jetour, Haval, Great Wall, GWM Tank, Voyah, LiXiang, AVATR, Hongqi, JAC, Soueast, Dongfeng, Foton | 18 | Real logo required; newer brands (Voyah, AVATR, GWM Tank) are the gaps |
| **C: Soviet/CIS makes** | Common on TM roads | Lada, Waz, UAZ, Gaz, Москвич, ZAZ, Iž, Raf, Kamaz, Zil, Maz, Ural, ПАЗ | 13 | Real logo where Commons has a PD file; otherwise letter mark |
| **D: trucks, buses, trailers** | Commercial | Man, DAF, Howo, Iveco, Kogel, Scania, Forland, Golden Dragon, Schmitz, CMC, CAMC, Zonda, International, Ozan, Kara, PPM, Fekon | ~17 | Nice to have; letter mark acceptable |
| **E: construction, agri, forklifts, moto** | Equipment | MTZ, Belarus, JCB, XCMG, Tadano Faun, New Holland, LiuGong, Lugong, Caterpillar, Komatsu, Hidromek, Heli, Jungheinrich, Bobcat, Foton Lovol, SDLG, Hamm, Case, SEM, Kato, YTO, SHANTUI, Bomag, Liebherr, Zoomlion, Balkancar, Yamaha, Jawa | ~28 | Letter mark by default; take a real logo only if a free SI/Commons file exists |
| **F: catalog junk / duplicates** | Not brands, or duplicates | Prisep ("прицеп" = trailer), Container, Kuba, John (probably a truncated John Deere), Waz (= VAZ, overlaps Lada), Belarus (= MTZ), Lugong (probably LiuGong) | ~4–7 | **Fix the catalog, not the logo.** Letter mark until cleaned up |

The tier boundaries are approximate. Some brands (Isuzu, Foton, Kamaz) sit in two tiers. The point is that about **80 brands (A+B+C)** need a real logo to meet the founder's "must-have". The ~50 in D–F can ship with letter marks without the picker looking broken.

---

## 2. Source comparison

Coverage figures were checked by script on 2026-09-22 against each source's published data file.

| Source | Licence of the files | Trademark caveat | Coverage of our 130 | Format |
|---|---|---|---|---|
| **Simple Icons** (`simple-icons` npm 16.32.0) | Project is **CC0-1.0** ([LICENSE.md](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md); npm registry `license: CC0-1.0`). The [DISCLAIMER](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md) warns that CC0 for the project does not mean every icon is CC0; see the notes below. | The DISCLAIMER says Simple Icons "cannot be held responsible for any legal activity raised by a brand" and asks users to "seek the correct permissions". Each entry has a `source` and sometimes a `guidelines` URL, and the DISCLAIMER asks users to follow the brand's guidelines. | **39 verified** by exact title match on `data/simple-icons.json`: Toyota, BMW, Hyundai, Volkswagen, Chevrolet, Mazda, Infiniti, Nissan, Kia, Audi, Jeep, Ford, Mitsubishi, Chrysler, MAN, Volvo, LADA, Opel, Honda, DAF, Peugeot, Renault, IVECO, Scania, JCB, Fiat, Subaru, Caterpillar, Porsche, MG, Mini, Suzuki, smart, Tesla, SEAT, Cadillac, ŠKODA, Citroën, Yamaha Motor. **Missing:** Mercedes-Benz, Lexus, BYD, all Chinese makes except MG, all CIS except LADA. | Single-path SVG, `viewBox="0 0 24 24"`, monochrome with a `hex` brand colour in the data ([CONTRIBUTING](https://github.com/simple-icons/simple-icons/blob/develop/CONTRIBUTING.md), icon guidelines). Well suited to tinting. |
| **Wikimedia Commons**, per file | Varies by file. Sampled car logos are mostly `{{PD-textlogo}}` ("does not meet the threshold of originality needed for copyright protection", [template](https://commons.wikimedia.org/wiki/Template:PD-textlogo)). Some are CC BY-SA (e.g. [File:Kia-logo.png](https://commons.wikimedia.org/wiki/File:Kia-logo.png), CC BY-SA 4.0, which requires attribution and share-alike). | `{{Trademarked}}`: "you have to ensure that you have the legal right to do so" ([template](https://commons.wikimedia.org/wiki/Template:Trademarked)). [Commons:Non-copyright restrictions](https://commons.wikimedia.org/wiki/Commons:Non-copyright_restrictions): the free licence does not cover trademark rights. | Sample via the Commons API `extmetadata`, 2026-09-22: **Public domain + trademarked** for Toyota (`Toyota_carlogo.svg`), BMW (`BMW.svg`), Mercedes-Benz (`Mercedes-Benz_Star_2022.svg`), Hyundai, Chery, Caterpillar, XCMG, BYD (`BYD_Auto_Logo.svg`); **PD textlogo** for Moskvich (`Logo_of_Moskvich.svg`). Lada/KAMAZ/UAZ/Lexus/Haval lookups failed on the guessed filenames and the search API rate-limited us, so **their coverage is unverified**. Estimate: most of Tier A/B, part of Tier C. | Mostly full-colour SVG. We would convert them to monochrome. |
| **filippofilip95/car-logos-dataset** | **None usable.** README says "MIT licensed (logos remain property of respective owners)", but there is no LICENSE file (`/LICENSE` returns 404; GitHub API `license: null`). Images are "crawled from Carlogos.org" ([README](https://github.com/filippofilip95/car-logos-dataset/blob/master/README.md)): 383 of 387 `image.source` values in `data.json` point to carlogos.org. The [carlogos.org terms](https://www.carlogos.org/terms/) forbid republishing "original content or database without written permission" and allow personal non-commercial use only. | Same trademark issue as everywhere, and no copyright chain either. | 77 exact slug matches (+ `li-auto` ≈ LiXiang). Highest coverage, but not usable. | PNG, mixed sizes (thumb 256 px high). |
| **Manufacturer press/media sites** | Toyota global site: "TMC prohibits the download, copying, distribution, or any other similar usage of all Toyota logos" ([terms](https://global.toyota/en/terms-of-use/index.html)). Toyota USA newsroom: editorial use only, per the search-result excerpt of [pressroom.toyota.com/terms-agreements](https://pressroom.toyota.com/terms-agreements/). That page returned 403 to our fetcher, so it is unverified directly. BMW MediaPool: media "used only for agreed purposes", and other companies "must apply in writing for written permission" ([mediaRights](https://mediapool.bmwgroup.com/download/edown/common/info?actEvent=mediaRights)). Hyundai, Kia, Lada/AvtoVAZ, Chery: **no terms page found or read; unverified.** | These terms are explicit contractual restrictions. Downloading from these sites is worse than using Commons. | Per brand, manual. | Varies |
| **Redraw our own monochrome set** | We would own the copyright in our drawing. For simple text/shape logos there is little copyright to infringe anyway (PD-textlogo reasoning). For complex emblems, a faithful redraw may be a derivative work. **(counsel)** | **Redrawing does not avoid trademark law.** Art. 3(3) of the TM law also covers a sign "сходное с ним до степени смешения" (confusingly similar), so a recognisable redraw is still the mark. | Any brand, but costs designer time per brand. | Whatever we choose |
| Logo CDNs (Clearbit, logo.dev, Brandfetch), logowik, vl.imgix "Vehicle Logotypes", tmcars.info | Not examined in depth. Excluded by the no-runtime-dependency constraint, and none offers a redistribution licence we could record. The old backend used them (§7). | n/a | n/a | n/a |

**Why Simple Icons first:** the files are already monochrome, single-path and uniformly boxed, so they look consistent at 30 px. Each entry also records its `source`, which we can copy straight into our manifest. The DISCLAIMER note that "the absence of license data for a particular icon does not imply that the icon is not released under a license" matters here: **none of the 39 matching car entries has a `license` field** (only 223 of 3,461 icons have one). So the CC0 dedication is Simple Icons' own. We record it as "CC0-1.0 (project); underlying mark © owner, trademark reserved".

---

## 3. Trademark: can we show a maker's logo to identify its cars?

### 3.1 Turkmenistan statute

- **The law in force** is the Law of Turkmenistan **No. 141-VI of 8 June 2019 "On Trademarks"** (Russian/Turkmen text on [WIPO Lex 20230](https://www.wipo.int/wipolex/en/legislation/details/20230); PDF `tm064ru_1.pdf`). Its Art. 38(2) **repeals** the 23 October 2008 law "On Trademarks, Service Marks and Appellations of Origin" ([WIPO Lex 14690](https://www.wipo.int/wipolex/en/legislation/details/14690)), which the research brief cited (the ticket names no law). WIPO Lex lists no later amendments to the 2019 law.
- **Art. 3(3):** the owner has the exclusive right to use the mark and to prohibit others from using the mark or a confusingly similar sign. The right applies to the goods and services listed in the certificate.
- **Art. 3(5):** "Никто не вправе использовать товарный знак, охраняемый в Туркменистане, без разрешения владельца." ("No one may use a trademark protected in Turkmenistan without the owner's permission.")
- **Art. 26(1):** "use" includes use in advertising, print, on signage, **and on the Internet**.
- **Art. 26(3), exhaustion:** the owner cannot prohibit use in relation to goods **put into circulation in Turkmenistan** by the owner or with its consent. This is national exhaustion. Many used cars in TM are private or grey imports first sold abroad, so it is unclear whether Art. 26(3) covers them. **(counsel)**
- **Art. 37(1):** unlawful use is defined as unauthorised use "в отношении однородных товаров" (in relation to similar/homogeneous goods), including use "при выполнении работ или оказании услуг" (when performing work or providing services). A classifieds service showing a Toyota emblem next to Toyota listings arguably falls inside that wording.
- **There is no explicit nominative, descriptive or referential fair-use exception in the 2019 statute.** We read every article heading and Arts. 3, 26, 27 and 37 in full. For contrast, EU law has an express "identifying or referring to goods … as those of the proprietor" limitation (Directive (EU) 2015/2436, Art. 14(1)(c)). That article was **not re-fetched today**, so treat the comparison as background only.

**Practical reading (not legal advice):** every classifieds platform in the region (Kolesa, Auto.ru, tmcars.info) shows maker logos this way. Enforcement against referential use by a listings marketplace is unlikely, and we found no Turkmen case law either way (**unverified**). Still, the statute does not protect us. Mitigations:

1. Show a logo only **as an identifier next to the brand name**: in the picker, and optionally on filter chips. Never in the AutoTM app icon, splash, ads, push-notification art or marketing.
2. Do not alter a logo so that it suggests an endorsement or partnership, and do not put "official", "partner" or "authorised" wording near it.
3. Add a legal line in About / Terms (RU/TK/EN): "Названия и логотипы марок являются товарными знаками их владельцев и используются только для обозначения марки автомобиля. AutoTM не связан с производителями." ("Brand names and logos are trademarks of their owners and are used only to identify the vehicle make. AutoTM is not affiliated with the manufacturers.")
4. Provide a **takedown path**: admin can clear any brand's logo, which falls back to a letter mark in one step (§4, §6).
5. Ask counsel **(counsel)**: whether Art. 26(3) and general civil-law good-faith principles cover referential use by a marketplace, and whether a notice-and-takedown procedure is enough.

### 3.2 Google Play: in-app use

- [Intellectual Property policy](https://support.google.com/googleplay/android-developer/answer/9888072): "We don't allow apps that infringe on others' trademarks". Infringement is defined as use "likely to cause confusion as to the source". Key Considerations: "Don't use another party's trademarks, such as logos or brand names without permission and/or in a way that could confuse users."
- [Impersonation policy](https://support.google.com/googleplay/android-developer/answer/9888374): the violation examples are copying a business logo "to falsely suggest it is an official app", and look-alike titles or icons. The rule: "Don't falsely imply an affiliation or relationship with another company".
- **Assessment:** a 30 px maker logo in a brand filter does not suggest AutoTM is Toyota's app, and it is the kind of identifying use every car-marketplace app on Play makes. The "without permission **and/or**" wording means Google *can* act on an owner's complaint. The main exposure is a rights-holder complaint to Google, and the takedown switch above is our answer to that.

### 3.3 Google Play: store listing

This is a separate and higher risk than in-app use.

- [Preview assets guidance](https://support.google.com/googleplay/android-developer/answer/9866151) (screenshots, feature graphic): "Avoid … Third-party trademarked characters or logos without proper permission."
- [Metadata policy](https://support.google.com/googleplay/android-developer/answer/9898842): "Don't use a celebrity's name or a brand's logo without permission."
- **Rule:** no maker logos in the Play icon, feature graphic, screenshots or promo video.
  - Capture store screenshots from screens without the picker, or from a staging build where every brand renders its letter mark. A seed flag or a staging-only brand set both work.
  - Use listing photos AutoTM owns and has cleared. Badges visible on photographed cars are incidental, and we judge them low risk (**unverified**; mention to counsel).

---

## 4. Missing-brand rule

**Rule: if a brand has no logo with a recorded free licence, show a generated letter mark. Never scrape a replacement on the fly.**

- **Content:** the first letter of `nameEn`, uppercased (Iž → "I", Москвич → "M" from its `nameEn`). One letter; no per-brand exceptions.
- **Rendering:** a 30×30 rounded-square chip with the neutral surface token background (`muted`, in light and dark) and the letter in `muted-foreground`, semibold. **Not** brand red, and never a random colour per brand: that looks like fake branding and fails dark-mode contrast.
- **Rendered on the client** from the name, so there is no file in storage and nothing to licence.
- **Applies to:** all Tier F rows (and those rows should be cleaned out of the catalog), most of Tier D/E, any Tier A–C brand without a PD/CC0 source, and any brand whose logo an admin has cleared after a complaint.
- **Accessibility:** the icon is decorative. The row's accessible label is the brand name. Mark the logo image or letter chip as hidden from screen readers so "T Toyota" is not read out. The whole row is the touch target, at least 48×48 dp ([Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps)); the 30 px icon does not need to be tappable itself.

---

## 5. Format and dark-mode spec for the 30 px icon

Facts ([expo-image, SDK 55](https://docs.expo.dev/versions/v55.0.0/sdk/image/)):
- `expo-image` supports **SVG** on Android and iOS, alongside PNG, WebP and AVIF.
- `tintColor` tints "template images (a bitmap image where only the opacity matters). The color is applied to every non-transparent pixel."
- `source` can be an **array**; "the source that fits best into the container size and is closest to the screen scale will be chosen."
- `cachePolicy` defaults to disk caching; `memory-disk` is also available.

`apps/mobile` already depends on `expo-image ~55.0.11` and `react-native-svg 15.15.3`. [react-native-svg](https://docs.expo.dev/versions/v55.0.0/sdk/svg/) draws SVG primitives. Loading remote SVG strings needs its `SvgUri`/`SvgXml`, which the Expo page does not document.

**Recommendation:**

| Aspect | Spec |
|---|---|
| Master (stored, never shipped to clients) | Monochrome SVG, square viewBox, logo fitted with ~8 % padding. Simple Icons paths as-is. Commons files flattened to one fill colour by the import script, with the change recorded in the manifest. |
| Delivered asset | **PNG alpha mask**: black on transparent at **30, 60 and 90 px** square (1×/2×/3×). WebP lossless is also fine, since `expo-image` supports it. PNG keeps the import simple and the files are under ~2 KB each. |
| Client render | `<Image source={[{uri:1x,width:30,height:30,scale:1}, …2x, …3x]} tintColor={theme.foreground} style={{width:30,height:30}} cachePolicy="disk" contentFit="contain" />` |
| Dark mode | **One asset**, tinted at runtime with the theme's foreground token. This follows [72-light-and-dark.md](../prd/ui/72-light-and-dark.md), which says the UI swaps tokens, not assets. No light/dark variants and no plate needed. |
| Why not SVG at runtime | `expo-image` can render SVG, but **whether `tintColor` applies to SVG sources in expo-image is unverified** (the docs describe it for bitmap template images). Rasterised masks behave predictably, decode cheaply in long lists and are tiny on metered TM data. |
| Colour logos (later, optional) | If design wants full-colour emblems, store `color@{1,2,3}x.png` and render them on a **light neutral plate** (a white/neutral-50 rounded chip) in both themes, because many emblems are dark blue or black and disappear on dark backgrounds. That doubles the assets and the licensing work; not MVP. |

---

## 6. Storage and provenance plan

**MinIO layout.** Use one public-read prefix for catalog assets. Either add a `catalog-assets` bucket to the ADR-0008 bucket list, or use a `catalog/` prefix in an existing public bucket (decide in the ADR):

```
catalog-assets/
  brands/{slug}/v{n}/master.svg        # not referenced by clients
  brands/{slug}/v{n}/mono@1x.png       # 30 px
  brands/{slug}/v{n}/mono@2x.png       # 60 px
  brands/{slug}/v{n}/mono@3x.png       # 90 px
```

Keys are **versioned and immutable**, so clients and any proxy can cache them forever. Replacing a logo writes `v{n+1}`; clearing one sets the DB field to null.

**Schema.** Add a nullable `Brand.logoVersion Int?` (or `logoKey String?`) to the `Brand` model (a Prisma migration, per repo rules). The API builds URLs from `MINIO_PUBLIC_URL` and returns `logo: { x1, x2, x3 } | null` through `@auto-tm/contracts`. A null `logo` means the client renders the letter mark.

**Provenance manifest**, committed to git (e.g. `packages/db/prisma/seed/brand-logos.manifest.json`), one entry per brand that has a logo:

```json
{
  "slug": "toyota",
  "version": 1,
  "source": "simple-icons",
  "sourceUrl": "https://github.com/simple-icons/simple-icons/blob/develop/icons/toyota.svg",
  "upstreamSource": "https://www.toyota.com/brandguidelines/logo/",
  "copyrightStatus": "CC0-1.0 (Simple Icons project dedication)",
  "licenceUrl": "https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md",
  "trademark": "Toyota Motor Corporation; used to identify vehicle make only",
  "retrievedAt": "2026-09-22",
  "sha256Master": "…",
  "transform": "none (already monochrome)",
  "reviewedBy": "…"
}
```

For Commons files, `sourceUrl` is the `File:` page, `copyrightStatus` is the licence template (`PD-textlogo`, `PD-shape`, or `CC BY-SA 4.0` plus the author), and `transform` records "flattened to single colour". **Reject any Commons file tagged non-free / fair use, or with no licence template.** Prefer PD over CC BY-SA, because BY-SA adds attribution and share-alike duties to a modified file.

**Import script** (one-off, run by a developer, not at runtime; this complies with the "no outbound dependency" rule because production never calls out):

1. Read the manifest, fetch each `sourceUrl`, and verify the file really is SVG/PNG by checking magic bytes and parsing it. Fail loudly on HTML.
2. Normalise it to the monochrome master and rasterise to 30/60/90 with Sharp (already the media worker's tool per ADR-0008).
3. Upload to MinIO, set `Brand.logoVersion`, and write the sha256 back into the manifest.

**Admin later:** the Admin "edit Brand" screen already lists "logo upload" ([31-catalog.md](../prd/features/31-catalog.md)). The admin upload should *require* filling in the manifest fields (source URL, licence) and should offer a **"Remove logo"** action for takedowns.

---

## 7. Prior art: what the Flutter-era backend did, and why not to repeat it

Read-only look at `/Users/bagtyyar/Projects/auto.tm-main/backend`:

- **Scripts:** `scripts/populate-brand-logos.js`, `populate-missing-logos.js`, `populate-jpg-logos.js` and `populate-remaining-tmcars.js`.
  - They read "match" JSON files from a **Gemini CLI temp directory** (`~/.gemini/tmp/<hash>/brand_matches_v5.json`, `wikimedia_matches.json`), not from the repo. There are **~20 iterations** of those files (`brand_matches_v2` … `v14_vectorlogo_png`, `v7_clearbit`, `v12_clearbit`, `v10_logowik`, `wikimedia_matches_v5_mini`, …).
  - `brand_matches_v5.json` alone pulls from `vl.imgix.net` (69), **`logo.clearbit.com` (25)**, raw GitHub (3) and logos-world.net (1).
  - `populate-jpg-logos.js` hardcodes `logowik.com` and Wikimedia thumbnail URLs.
  - The scripts spoof a Chrome `User-Agent`, sleep to dodge 429 rate limits, and log in with a seed phone and a fixed OTP.
  - `populate-remaining-tmcars.js` was never finished (its body is only comments about getting "Base64 data from the model").
- **Output:** `backend/uploads/brand/` holds **1,773 files** (1,623 `.png`, 116 `.svg`, 34 `.jpg`). That is far more than the brand count, so re-runs left duplicates.
  - Of the first 400 files, 350 are 240×180 and the rest vary (640×480, 2560×1440, 1200×1200, …).
  - **49 files across the directory are HTML documents, not images.** These are error pages saved with an image extension, because the scripts label every download `image/png` without checking the bytes.
- **Why not repeat it:**
  1. **No licence record.** Nothing captured the source or rights per file, and the match lists sat outside the repo in a temp directory.
  2. **Hotlinked or third-party logo services** (Clearbit, imgix-hosted "Vehicle Logotypes", logowik) with unknown or restrictive terms.
  3. **Mixed sizes, aspect ratios and formats**, so icons look inconsistent at 30 px and colour logos break in dark mode.
  4. **Broken files** served as images.
  5. **Not reproducible:** the pipeline was LLM-assisted with iterative guessing.

  The plan in §6 addresses each point: a manifest in git, one normalised format, magic-byte validation, and a fixed short source list.

---

## 8. Lowest-effort lawful path, step by step

1. Pin the `simple-icons` version. Map our slugs to its 39 icons, then write the manifest entries.
2. For Tier A–C brands not in SI (Mercedes-Benz, Lexus, Genesis, Chery, Changan, Geely, Haval, BYD, Hongqi, JAC, Great Wall, Kamaz, UAZ, GAZ, Moskvich, ZAZ, …), look up the Commons `File:` page, check the licence template in `extmetadata`, and accept only PD-textlogo / PD-shape (or CC with attribution if nothing else exists). This is a few hours of manual work.
3. Everything else gets a letter mark. Clean the Tier F rows out of the catalog separately.
4. Run the import script once per environment (staging, production).
5. Store listing assets: capture them from a build with letter marks only.

Expected result: roughly **70–80 real logos** (39 from SI plus an estimated 30–40 from Commons; the Commons count is **unverified** until step 2 is done) and **~50 letter marks**, with a licence line for every file.

---

## 9. Open questions

1. **(counsel)** Is referential display of maker logos in a classifieds app lawful under Law No. 141-VI (Arts. 3(5), 26(3), 37) and the Civil Code of Turkmenistan? Does it matter that cars were first sold abroad (national exhaustion)?
2. **(counsel)** Is a faithful monochrome conversion of a PD-textlogo emblem still "confusingly similar" use under Art. 3(3)? (We assume yes; it only helps with copyright.)
3. **ADR:** new `catalog-assets` bucket vs. a prefix in an existing bucket; `Brand.logoVersion` field; manifest location.
4. **Product:** mono-only for MVP, or does the founder expect colour emblems? Colour doubles the asset work and needs a plate in dark mode.
5. **Catalog hygiene:** delete or merge Prisep, Container, Kuba, John, Waz↔Lada, Belarus↔MTZ, Lugong↔LiuGong? (Out of scope here.)
6. Does `expo-image` `tintColor` work on SVG sources on Android and iOS? It only matters if we later ship SVG instead of PNG masks. **Unverified.**
7. Should brand logos appear on web (`apps/web`) too? Same assets and the same rules apply.

---

## Sources

- Repo: `packages/db/prisma/seed/brands.json`; `packages/db/prisma/schema.prisma` (`model Brand`); `apps/api/.env.template` (`MINIO_*`); [ADR-0008](../adr/0008-media.md); [31-catalog.md](../prd/features/31-catalog.md); [72-light-and-dark.md](../prd/ui/72-light-and-dark.md); `apps/mobile/package.json`.
- Old backend (read-only, local): `/Users/bagtyyar/Projects/auto.tm-main/backend/scripts/populate-*.js`, `backend/uploads/brand/`, `~/.gemini/tmp/<hash>/brand_matches_*.json`.
- car-logos-dataset: https://github.com/filippofilip95/car-logos-dataset (README; `logos/data.json`; `/LICENSE` returns 404; `gh api repos/filippofilip95/car-logos-dataset` → `license: null`), https://www.carlogos.org/terms/
- Simple Icons: https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md, https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md, https://github.com/simple-icons/simple-icons/blob/develop/CONTRIBUTING.md, https://raw.githubusercontent.com/simple-icons/simple-icons/develop/data/simple-icons.json, https://registry.npmjs.org/simple-icons/latest
- Wikimedia Commons: https://commons.wikimedia.org/wiki/Template:Trademarked, https://commons.wikimedia.org/wiki/Template:PD-textlogo, https://commons.wikimedia.org/wiki/Commons:Non-copyright_restrictions, file pages via `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=extmetadata` for `File:Toyota_carlogo.svg`, `File:BMW.svg`, `File:Mercedes-Benz_Star_2022.svg`, `File:Hyundai_Motor_Company_logo.svg`, `File:Chery_logo.svg`, `File:Caterpillar_logo.svg`, `File:XCMG_logo.svg`, `File:BYD_Auto_Logo.svg`, `File:Logo_of_Moskvich.svg`, `File:Kia-logo.png`
- Turkmenistan: https://www.wipo.int/wipolex/en/legislation/details/20230 (Law No. 141-VI of 8 June 2019 "On Trademarks", Russian text `tm064ru_1.pdf`), https://www.wipo.int/wipolex/en/legislation/details/14690 (2008 law, repealed)
- Google Play: https://support.google.com/googleplay/android-developer/answer/9888072, https://support.google.com/googleplay/android-developer/answer/9888374, https://support.google.com/googleplay/android-developer/answer/9866151, https://support.google.com/googleplay/android-developer/answer/9898842
- Manufacturers: https://global.toyota/en/terms-of-use/index.html, https://pressroom.toyota.com/terms-agreements/ (403 to our fetcher; content via search excerpt, unverified), https://mediapool.bmwgroup.com/download/edown/common/info?actEvent=mediaRights
- Expo/Android: https://docs.expo.dev/versions/v55.0.0/sdk/image/, https://docs.expo.dev/versions/v55.0.0/sdk/svg/, https://developer.android.com/guide/topics/ui/accessibility/apps
- Not consulted: Context7 MCP (server failed to connect this session), so Expo facts come from docs.expo.dev directly.
