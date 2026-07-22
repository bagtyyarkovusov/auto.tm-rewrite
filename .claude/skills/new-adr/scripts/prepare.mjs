#!/usr/bin/env node

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const topic = process.argv.slice(2).join(" ").trim();

if (!topic) {
  console.error('Usage: prepare.mjs "ADR topic"');
  process.exitCode = 2;
} else {
  const skillScriptDir = fileURLToPath(new URL(".", import.meta.url));
  const repositoryRoot = resolve(skillScriptDir, "../../../..");
  const adrDir = resolve(repositoryRoot, "docs", "adr");
  const files = readdirSync(adrDir).filter((file) => /^\d{4}-.+\.md$/.test(file));
  const highest = files.reduce((max, file) => Math.max(max, Number(file.slice(0, 4))), 0);
  const number = String(highest + 1).padStart(4, "0");
  const slug = topic
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  if (!slug) {
    console.error("Topic must contain at least one ASCII letter or digit for a stable filename.");
    process.exitCode = 2;
  } else {
    const tokens = new Set(slug.split("-").filter((token) => token.length >= 4));
    const collisions = files.filter((file) => {
      const candidate = file.replace(/^\d{4}-|\.md$/g, "");
      return [...tokens].some((token) => candidate.includes(token));
    });

    process.stdout.write(
      `${JSON.stringify(
        {
          number,
          title: topic,
          slug,
          filename: `${number}-${slug}.md`,
          collisions,
        },
        null,
        2,
      )}\n`,
    );
  }
}
