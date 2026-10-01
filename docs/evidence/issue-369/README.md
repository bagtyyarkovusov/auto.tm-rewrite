# Issue #369 native evidence (Search screen)

- **PR / commit:** #470, app code at `b5c95ce712971cef34894d6be899e4fdd44b5502`.
- **Backend:** Railway PR environment `auto.tm-rewrite-pr-470`, ID `b801eeac-8dd7-4296-8fda-6739b5678919` (project `176ddec0-dd65-4087-b82c-798599fc2ebe`). API deployment `2c8c2f70-6c58-429e-91a1-1415f2adc9ac` SUCCESS; `/readyz` reports `commitSha` `b5c95ce712971cef34894d6be899e4fdd44b5502`, postgres/redis/minio `ok`. Seeded with `native-pr-seed.mjs --remote` (demo data, mock SMS).
- **Device:** iOS Simulator "AutoTM Queue B iPhone 17", iOS 26.2, UUID `3A8BB230-13C9-4624-8239-395A6E887D4C`, `tm.auto.app` development client, Metro port 8469, `EXPO_PUBLIC_API_URL`/`WS_URL`/`MEDIA_URL` pointed at the PR 470 hosts. UI language Russian.
- **Driving:** macOS Screen Recording was not granted to computer use, so taps and typing used Maestro (`maestro --device <UUID>`); screenshots are Maestro `takeScreenshot` frames, converted to JPEG.
- **Docker absent:** `docker info` reports `failed to connect to the docker API at unix:///Users/bagtyyar/.docker/run/docker.sock ... no such file or directory`; no Docker daemon process was running.
- No login was performed, so no OTPs exist. Home and Search are public.

| Acceptance state | Evidence |
|---|---|
| Keyboard open on entry, Popular brands before typing | `02-search-empty-keyboard.jpg` |
| Recent (Toyota Camry, with Clear) and Popular together | `06-search-recent-and-popular.jpg` |
| Model result "Toyota Camry" for the query `camry` | `03-camry-model-result.jpg` |
| Tapping it opens Results for Toyota Camry; it then appears in Recent | `05-results-toyota-camry.jpg`, `06-search-recent-and-popular.jpg` |
| `camry 2018` rows carry year 2018 and open Results with the 2018 – 2018 chip | `07a-camry-2018-result.jpg`, `07-results-camry-2018.jpg` |
| `2018` alone: "Все автомобили, 2018" opens the feed filtered to 2018 – 2018 | `08a-year-only-row.jpg`, `08-results-year-2018-feed.jpg` |
| Brand result (Lexus, "Марка") opens whole-brand Results ("Все модели") | `09a-lexus-brand-result.jpg`, `09-results-whole-brand-lexus.jpg` |
| No match: clear message, query still editable | `04-no-match-query-editable.jpg` (query `камри`) |
| Back returns to the original Home | `10-home-scrolled-before.jpg`, `11-…back-1.jpg`, `12-…back-2.jpg`, `13-…edge-back-gesture.jpg` |

## Back proof

Home was scrolled a small offset (10). Search → Back twice (11, 12) restored Home at the same scroll offset, so it was not remounted or replaced with a fresh Home. An edge-back swipe from Home afterwards (13) stayed on Home. This is indirect: two identical Home screens cannot be told apart by the swipe alone; the preserved scroll offset is the discriminating evidence.

## Limits

- **Cyrillic model spelling is not proven natively.** The seeded reference catalog carries Latin model names, so the live API returns no model for `камри` (and `/catalog/search?q=камри` returns `[]`) while `camry` returns Toyota Camry, Camry Hybrid and Suzuki Carry; brand `тойота` does match. Cyrillic `камри` → Camry is covered by API and mobile unit tests only. Frame 04 shows the honest no-match for `камри` against this data.
- `camry 2018` and `2018` Results show 0 and a filtered feed respectively because of fixture years (the fixture Camry is 2021).
