import { describe, it, expect } from "vitest";

import { validateReturnTo, validateOrigin } from "./validators";

describe("validateReturnTo", () => {
  it("accepts a simple relative path", () => {
    expect(validateReturnTo("/reports")).toBe("/reports");
  });

  it("accepts a path with query params", () => {
    expect(validateReturnTo("/reports?page=2")).toBe("/reports?page=2");
  });

  it("accepts a nested path", () => {
    expect(validateReturnTo("/reports/123")).toBe("/reports/123");
  });

  it("rejects absolute URLs", () => {
    expect(validateReturnTo("https://evil.com/reports")).toBeNull();
  });

  it("rejects protocol-relative URLs", () => {
    expect(validateReturnTo("//evil.com/reports")).toBeNull();
  });

  it("rejects javascript: scheme", () => {
    expect(validateReturnTo("javascript:alert(1)")).toBeNull();
  });

  it("rejects paths without leading slash", () => {
    expect(validateReturnTo("reports")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(validateReturnTo("")).toBeNull();
  });

  it("rejects null/undefined", () => {
    expect(validateReturnTo(null)).toBeNull();
    expect(validateReturnTo(undefined)).toBeNull();
  });

  it("rejects paths with dangerous characters", () => {
    expect(validateReturnTo("/reports<script>")).toBeNull();
    expect(validateReturnTo("/reports|pipe")).toBeNull();
  });
});

describe("validateOrigin", () => {
  it("accepts matching origin", () => {
    const request = new Request("http://admin.auto.tm/login", {
      headers: { origin: "http://admin.auto.tm" },
    });
    expect(validateOrigin(request, "http://admin.auto.tm")).toBe(true);
  });

  it("rejects mismatched origin", () => {
    const request = new Request("http://admin.auto.tm/login", {
      headers: { origin: "http://evil.com" },
    });
    expect(validateOrigin(request, "http://admin.auto.tm")).toBe(false);
  });

  it("rejects missing origin header", () => {
    const request = new Request("http://admin.auto.tm/login");
    expect(validateOrigin(request, "http://admin.auto.tm")).toBe(false);
  });

  it("derives origin from request URL when no configured origin provided", () => {
    const request = new Request("http://admin.auto.tm/login", {
      headers: { origin: "http://admin.auto.tm" },
    });
    expect(validateOrigin(request)).toBe(true);
  });

  it("rejects derived origin mismatch", () => {
    const request = new Request("http://admin.auto.tm/login", {
      headers: { origin: "http://other.com" },
    });
    expect(validateOrigin(request)).toBe(false);
  });

  it("does not fall back to Referer", () => {
    const request = new Request("http://admin.auto.tm/login", {
      headers: {
        referer: "http://admin.auto.tm",
      },
    });
    expect(validateOrigin(request, "http://admin.auto.tm")).toBe(false);
  });
});
