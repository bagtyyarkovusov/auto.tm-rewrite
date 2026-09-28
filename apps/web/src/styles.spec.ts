import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const stylesheetPath = fileURLToPath(
  new URL("./app/[locale]/globals.css", import.meta.url),
);

describe("web Tailwind entrypoint", () => {
  it("generates shared UI component utilities and theme tokens", async () => {
    const source = await readFile(stylesheetPath, "utf8");
    const result = await postcss([tailwindcss()]).process(source, {
      from: stylesheetPath,
    });

    expect(result.css).toMatch(/\.p-6\s*\{/);
    expect(result.css).toMatch(/\.bg-surface\s*\{/);
    expect(result.css).toMatch(/\.text-text-primary\s*\{/);
    expect(result.css).toContain(
      '--font-sans: "Inter", system-ui, sans-serif;',
    );
    expect(result.css).not.toContain("--font-sans: var(--font-sans);");
  });
});
