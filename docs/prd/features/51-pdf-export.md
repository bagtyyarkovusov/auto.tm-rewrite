# 51 — PDF export for inspection reports (Phase 2)

## Summary

Inspection reports are exportable as PDF for buyers to download, view offline, print, or share with mechanics. Server-side rendering via Puppeteer + HTML template — same template renders the admin preview, ensuring on-screen and printed versions match.

## Why it exists

Buyers want a tangible artifact they can:
- Save to their phone
- Show to their family / partner before buying
- Take to an independent mechanic for review
- Reference after purchase (warranty disputes, future resale)

Without PDF export, the inspection report exists only as a transient screen — less trust, less utility.

## What it does (user-visible behavior)

### Generation flow (admin side)

1. Admin clicks "Publish" on a draft report
2. Server kicks off PDF generation:
   - Puppeteer renders the HTML template
   - Output saved to MinIO `inspection-reports` bucket
   - Versioned key: `report_{reportId}_v{version}.pdf`
3. `PdfArtifact` record created with key + version + generatedAt
4. Listing displays "View report" link
5. If the report is later edited and republished: new PDF version, old preserved

### Download flow (buyer side)

- Listing detail → "View inspection report"
- Mobile: opens native PDF viewer (downloads to app's document directory)
- Web: standard browser download or in-tab PDF view

### PDF content (template)

- Page 1 — Cover:
  - AutoTM logo (top left)
  - Title: "Inspection Report"
  - Vehicle: Brand Model, Year, VIN
  - Tier badge prominently (Gold/Silver/Bronze)
  - Inspector name + date
  - QR code linking back to the listing URL
- Page 2+ — Per-section breakdown:
  - Section name + score / max
  - Per-item: name, score, inspector notes
  - Photos inline (up to 2 per item)
- Last page — Disclaimer + how to read the report

Trilingual versions generated based on listing's detected language or admin's selection.

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Admin: report edit | Draft | "Save draft" + "Submit for review" |
| Admin: report edit | Submitted | Locked from edit; awaiting publish |
| Admin: publish modal | Default | "Publishing this generates a PDF and notifies the seller. Proceed?" |
| Admin: publish flow | Generating | Spinner + "Generating PDF…" (~5-10s typical) |
| Admin: publish flow | Success | Toast: "Published. PDF available." Link to download. |
| Listing (buyer) | Report available | "View inspection report" button |
| PDF view | Default | Native viewer |
| PDF view | Sharing | Native share sheet (save / send via WhatsApp / etc) |

## Data references

- `apps/api/src/modules/reports/CONTEXT.md` — PdfArtifact entity (Phase 2)
- MinIO bucket: `inspection-reports`

## Decisions

- **Puppeteer over `pdfkit` / `pdfmake`** — full CSS, Cyrillic + Turkmen font support, identical HTML preview, no library quirks
- **Stored, not regenerated on every view** — once generated, served from MinIO with cache headers
- **Versioned** — old PDF preserved on re-publish for historical reference
- Trilingual generation — separate file per language; size acceptable

## Phase

**Phase 2.**

## Out of scope

- Editable / fillable PDF forms — static output only
- Digital signatures on PDFs (defer; if needed, sign with AutoTM key)
- Custom branding per dealership in PDF (admin-only AutoTM branding)
- Watermarking for "draft" / "preview" PDFs

## Open questions

- Should buyers be able to download a PDF of a *non-inspected* listing's specs? (Probably not — only inspected listings get a PDF; it's part of the value)
- Should PDFs include all photos from the listing, or only the inspection's photos? (Inspection photos only — different purpose)
- Font licensing — Inter is open source, but verify Cyrillic + Turkmen support
