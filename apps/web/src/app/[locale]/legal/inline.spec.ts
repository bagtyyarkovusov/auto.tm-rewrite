import { describe, expect, it } from "vitest";

import { inlineMarkupToHtml } from "./inline";

describe("inlineMarkupToHtml", () => {
  it("renders bold and code", () => {
    expect(inlineMarkupToHtml("a **30-day** `grace`")).toBe(
      "a <strong>30-day</strong> <code>grace</code>",
    );
  });

  it("renders a site-relative link", () => {
    expect(inlineMarkupToHtml("the [deletion page](/en/account/delete).")).toBe(
      'the <a href="/en/account/delete" class="underline underline-offset-4 print:no-underline">deletion page</a>.',
    );
  });

  it("leaves external and script links as text", () => {
    const text =
      '[a](https://example.com) [b](javascript:alert(1)) [c](//evil.example) [d](/\\evil.example) [e](/x"onclick=y)';
    expect(inlineMarkupToHtml(text)).toBe(text);
  });
});
