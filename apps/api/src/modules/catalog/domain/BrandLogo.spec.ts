import { describe, expect, it } from "vitest";

import {
  BRAND_LOGO_MAX_BYTES,
  brandLogoKey,
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
    ["animation", svg('<set attributeName="href" to="javascript:alert(1)"/>')],
  ])("rejects %s", (_name, text) => {
    expect(checkBrandLogoSvgSafety(text)).toBe("LOGO_UNSAFE_SVG");
  });
});

describe("brandLogoKey", () => {
  it("builds a versioned key under the brand slug with the file extension", () => {
    expect(brandLogoKey("toyota", "v17", "image/svg+xml")).toBe("brands/toyota/v17/logo.svg");
    expect(brandLogoKey("bmw", "v2", "image/webp")).toBe("brands/bmw/v2/logo.webp");
  });
});
