import { describe, expect, it } from "vitest";

import { CatalogSchemas } from "@auto-tm/contracts";

import {
  BRAND_LOGO_CONTENT_TYPES,
  BRAND_LOGO_MAX_BYTES,
  BRAND_LOGO_REJECTIONS,
  brandLogoCleanupTarget,
  brandLogoKey,
  isPendingBrandLogoKey,
  newAdminLogoVersion,
  parseStoredBrandLogoKey,
  pendingBrandLogoKey,
  storedBrandLogoType,
  checkBrandLogoFile,
  checkBrandLogoImage,
  checkBrandLogoSvgSafety,
} from "./BrandLogo";

describe("checkBrandLogoFile", () => {
  it("accepts SVG, PNG, and WebP up to 200 KB", () => {
    expect(checkBrandLogoFile("image/svg+xml", 1)).toBeNull();
    expect(checkBrandLogoFile("image/png", BRAND_LOGO_MAX_BYTES)).toBeNull();
    expect(checkBrandLogoFile("image/webp", 1024)).toBeNull();
  });

  it("rejects other types, empty files, and files over 200 KB", () => {
    expect(checkBrandLogoFile("image/jpeg", 10)).toBe("LOGO_UNSUPPORTED_TYPE");
    expect(checkBrandLogoFile("image/png", 0)).toBe("LOGO_EMPTY");
    expect(checkBrandLogoFile("image/png", BRAND_LOGO_MAX_BYTES + 1)).toBe("LOGO_TOO_LARGE");
  });
});

describe("checkBrandLogoImage", () => {
  it("accepts a roughly square image whose format matches the declared type", () => {
    expect(checkBrandLogoImage("image/png", { format: "png", width: 100, height: 80 })).toBeNull();
    expect(checkBrandLogoImage("image/svg+xml", { format: "svg", width: 24, height: 24 })).toBeNull();
  });

  it("rejects unreadable, mismatched, and elongated images", () => {
    expect(checkBrandLogoImage("image/png", null)).toBe("LOGO_UNREADABLE");
    expect(checkBrandLogoImage("image/webp", { format: "png", width: 10, height: 10 })).toBe(
      "LOGO_TYPE_MISMATCH",
    );
    expect(checkBrandLogoImage("image/png", { format: "png", width: 126, height: 100 })).toBe(
      "LOGO_NOT_SQUARE",
    );
    expect(checkBrandLogoImage("image/png", { format: "png", width: 10, height: 30 })).toBe(
      "LOGO_NOT_SQUARE",
    );
  });
});

describe("checkBrandLogoSvgSafety", () => {
  const svg = (body: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`;

  it("accepts plain paths and same-document references", () => {
    expect(checkBrandLogoSvgSafety(svg('<path d="M0 0h24v24H0z"/>'))).toBeNull();
    expect(
      checkBrandLogoSvgSafety(
        svg('<linearGradient id="a"/><linearGradient xlink:href="#a"/><path fill="url(#a)"/>'),
      ),
    ).toBeNull();
    expect(checkBrandLogoSvgSafety(svg('<use href="#p"/><style>.a{fill:#000}</style>'))).toBeNull();
  });

  it.each([
    ["script", svg("<script>alert(1)</script>")],
    ["event handler", svg('<path onload="alert(1)"/>')],
    ["javascript URL", svg('<a xlink:href="javascript:alert(1)"/>')],
    ["external href", svg('<use href="https://evil.example/x.svg#a"/>')],
    ["external url()", svg('<path fill="url(https://evil.example/x)"/>')],
    ["foreignObject", svg("<foreignObject><div/></foreignObject>")],
    ["embedded image", svg('<image href="data:image/png;base64,AAAA"/>')],
    ["DOCTYPE entity", `<!DOCTYPE svg [<!ENTITY x "y">]>${svg("")}`],
    ["css import", svg('<style>@import "https://evil.example/a.css";</style>')],
    ["escaped css import", svg('<style>@\\69mport "https://evil.example/a.css";</style>')],
    ["prefixed script", svg('<s:script xmlns:s="http://www.w3.org/2000/svg">alert(1)</s:script>')],
    ["prefixed set", svg('<s:set attributeName="fill" to="red"/>')],
    ["xinclude", svg('<xi:include href="/etc/passwd"/>')],
    ["animation", svg('<set attributeName="href" to="javascript:alert(1)"/>')],
  ])("rejects %s", (_name, text) => {
    expect(checkBrandLogoSvgSafety(text)).toBe("LOGO_UNSAFE_SVG");
  });
});

describe("keys", () => {
  it("stores SVG and PNG uploads as PNG and keeps WebP", () => {
    expect(storedBrandLogoType("image/svg+xml")).toBe("image/png");
    expect(storedBrandLogoType("image/png")).toBe("image/png");
    expect(storedBrandLogoType("image/webp")).toBe("image/webp");
  });

  it("builds a versioned key under the brand slug", () => {
    expect(brandLogoKey("toyota", "v17", "image/png")).toBe("brands/toyota/v17/logo.png");
    expect(brandLogoKey("bmw", "v2", "image/webp")).toBe("brands/bmw/v2/logo.webp");
  });

  it("accepts only this brand's pending keys", () => {
    const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
    expect(isPendingBrandLogoKey("toyota", pendingBrandLogoKey("toyota", id))).toBe(true);
    expect(isPendingBrandLogoKey("toyota", pendingBrandLogoKey("bmw", id))).toBe(false);
    expect(isPendingBrandLogoKey("toyota", "brands/toyota/v1/logo.png")).toBe(false);
    expect(isPendingBrandLogoKey("toyota", `pending/brands/toyota/../../brands/x`)).toBe(false);
  });
});

const UUID_A = "0f8fad5b-d9cb-469f-a165-70867728950e";
const UUID_B = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";

describe("admin activation versions", () => {
  it("gives two uploads in the same millisecond distinct directories", () => {
    const first = newAdminLogoVersion(1790000000000, UUID_A);
    const second = newAdminLogoVersion(1790000000000, UUID_B);
    expect(first).toBe(`v1790000000000-${UUID_A}`);
    expect(first).not.toBe(second);
    expect(brandLogoKey("toyota", first, "image/png")).toBe(
      `brands/toyota/v1790000000000-${UUID_A}/logo.png`,
    );
  });
});

describe("parseStoredBrandLogoKey", () => {
  it.each([
    [`brands/toyota/imp-0123456789ab/logo.png`, "toyota", "imp-0123456789ab", "imported"],
    [`brands/toyota/imp-0123456789ab-${UUID_A}/logo.png`, "toyota", `imp-0123456789ab-${UUID_A}`, "imported"],
    [`brands/toyota/v1790000000000/logo.webp`, "toyota", "v1790000000000", "admin"],
    [`brands/toyota/v1790000000000-${UUID_A}/logo.png`, "toyota", `v1790000000000-${UUID_A}`, "admin"],
    [`brands/tofaş/imp-0123456789ab-${UUID_B}/logo.png`, "tofaş", `imp-0123456789ab-${UUID_B}`, "imported"],
  ])("recognizes %s from the stored key alone", (key, slug, version, owner) => {
    expect(parseStoredBrandLogoKey(key)).toEqual({
      slug,
      version,
      owner,
      directory: `brands/${slug}/${version}/`,
    });
  });

  it("reads the content identity of an imported key, with or without an activation id", () => {
    expect(parseStoredBrandLogoKey("brands/bmw/imp-0123456789ab/logo.png")).toMatchObject({
      contentIdentity: "imp-0123456789ab",
    });
    expect(parseStoredBrandLogoKey(`brands/bmw/imp-0123456789ab-${UUID_A}/logo.png`)).toMatchObject({
      contentIdentity: "imp-0123456789ab",
    });
    expect(parseStoredBrandLogoKey("brands/bmw/v1/logo.png")).not.toHaveProperty("contentIdentity");
  });

  it.each([
    "brands/toyota/logo.png",
    "brands/toyota/other/logo.png",
    "brands/toyota/imp-xyz/logo.png",
    "brands/toyota/v1/mono@1x.png",
    "brands/toyota/v1/nested/logo.png",
    "brands/../v1/logo.png",
    `pending/brands/toyota/${UUID_A}`,
    `brands/toyota/v1-${UUID_A.toUpperCase()}/logo.png`,
    "",
  ])("does not recognize %j", (key) => {
    expect(parseStoredBrandLogoKey(key)).toBeNull();
  });
});

describe("brandLogoCleanupTarget", () => {
  it("targets the whole stored directory, whatever the brand's current slug", () => {
    expect(brandLogoCleanupTarget(`brands/oldslug/imp-0123456789ab-${UUID_A}/logo.png`)).toEqual({
      kind: "directory",
      prefix: `brands/oldslug/imp-0123456789ab-${UUID_A}/`,
    });
    expect(brandLogoCleanupTarget("brands/toyota/v1790000000000/logo.webp")).toEqual({
      kind: "directory",
      prefix: "brands/toyota/v1790000000000/",
    });
  });

  it("falls back to the single object for a key outside a recognized directory", () => {
    expect(brandLogoCleanupTarget("brands/toyota/custom/logo.png")).toEqual({
      kind: "object",
      key: "brands/toyota/custom/logo.png",
    });
    expect(brandLogoCleanupTarget("somewhere/else.png")).toEqual({
      kind: "object",
      key: "somewhere/else.png",
    });
  });
});

describe("contract parity", () => {
  it("matches the limits and reasons published in @auto-tm/contracts", () => {
    expect(BRAND_LOGO_MAX_BYTES).toBe(CatalogSchemas.BRAND_LOGO_MAX_BYTES);
    expect([...BRAND_LOGO_CONTENT_TYPES]).toEqual(CatalogSchemas.BrandLogoContentTypeSchema.options);
    expect([...BRAND_LOGO_REJECTIONS]).toEqual(CatalogSchemas.BrandLogoRejectionReasonSchema.options);
  });
});
