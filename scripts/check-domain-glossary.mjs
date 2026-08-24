#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const rootIndex = args.indexOf("--root");
const repoRoot = rootIndex === -1 ? defaultRoot : resolve(args[rootIndex + 1]);
const glossaryPath = resolve(repoRoot, "docs/domain/GLOSSARY.md");
const glossaryOnly = args.includes("--glossary-only");
const allowedHeadings = new Set([
  "Cross-context", "Identity", "Catalog", "Listings", "Subscriptions",
  "Conversations", "Notifications", "Content", "Reports", "Admin",
]);
const forbiddenHeadings = new Set([
  "Future work", "Implementation status", "Roadmap", "Translations",
]);

if (!existsSync(glossaryPath)) {
  console.error("- missing required file docs/domain/GLOSSARY.md");
  process.exit(1);
}

const lines = readFileSync(glossaryPath, "utf8").split(/\r?\n/);
const errors = [];
const canonicalTerms = new Map();
const avoidedTerms = [];
let currentHeading;
let termCount = 0;

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index];
  const heading = /^## (.+)$/.exec(line);
  if (heading) {
    currentHeading = heading[1];
    if (forbiddenHeadings.has(currentHeading)) {
      errors.push(`line ${index + 1}: forbidden glossary section "${currentHeading}"`);
    } else if (!allowedHeadings.has(currentHeading)) {
      errors.push(`line ${index + 1}: unknown glossary heading "${currentHeading}"`);
    }
    continue;
  }

  const term = /^\*\*(.+)\*\*:?$/.exec(line);
  if (!term) {
    if (line.startsWith("**")) errors.push(`line ${index + 1}: malformed term entry`);
    continue;
  }

  termCount += 1;
  const normalizedTerm = term[1].trim().toLocaleLowerCase("en-US");
  if (canonicalTerms.has(normalizedTerm)) {
    errors.push(`line ${index + 1}: duplicate canonical term "${term[1]}" (first defined on line ${canonicalTerms.get(normalizedTerm)})`);
  } else {
    canonicalTerms.set(normalizedTerm, index + 1);
  }
  if (!currentHeading) errors.push(`line ${index + 1}: term "${term[1]}" is not under a known heading`);

  const followingLines = lines.slice(index + 1);
  const definitionOffset = followingLines.findIndex((candidate) => candidate.trim() !== "");
  const definition = definitionOffset === -1 ? undefined : followingLines[definitionOffset];
  if (!definition || definition.startsWith("_Avoid_:") || definition.startsWith("## ") || definition.startsWith("**")) {
    errors.push(`line ${index + 1}: term "${term[1]}" needs a definition`);
    continue;
  }

  const sentenceCount = definition.match(/[.!?](?:\s|$)/g)?.length ?? 0;
  if (sentenceCount < 1 || sentenceCount > 2) {
    errors.push(`line ${index + 1}: definition for "${term[1]}" must contain one or two sentences`);
  }

  const avoidLine = followingLines.slice(definitionOffset + 1).find((candidate) => candidate.trim() !== "");
  if (avoidLine?.startsWith("_Avoid_:")) {
    for (const synonym of avoidLine.slice("_Avoid_:".length).split(",")) {
      const trimmed = synonym.trim();
      if (trimmed) avoidedTerms.push({ line: index + definitionOffset + 3, normalized: trimmed.toLocaleLowerCase("en-US"), synonym: trimmed });
    }
  }
}

if (termCount === 0) errors.push("glossary must define at least one canonical term");
for (const avoided of avoidedTerms) {
  const canonicalLine = canonicalTerms.get(avoided.normalized);
  if (canonicalLine) {
    const canonicalName = lines[canonicalLine - 1].replace(/^\*\*|\*\*:?$/g, "");
    errors.push(`line ${avoided.line}: avoided synonym "${avoided.synonym}" collides with canonical term "${canonicalName}"`);
  }
}

function requireReference(relativePath, requiredText, diagnostic) {
  const path = resolve(repoRoot, relativePath);
  if (!existsSync(path) || !readFileSync(path, "utf8").includes(requiredText)) errors.push(diagnostic);
}

if (!glossaryOnly) {
  const packagePath = resolve(repoRoot, "package.json");
  let packageJson;
  if (existsSync(packagePath)) {
    try { packageJson = JSON.parse(readFileSync(packagePath, "utf8")); }
    catch { errors.push("package.json is not valid JSON"); }
  }
  if (packageJson?.scripts?.["check:glossary"] !== "node scripts/check-domain-glossary.mjs") {
    errors.push("package.json is missing the check:glossary script");
  }
  requireReference("docs/adr/0042-domain-glossary-authority-and-mutability.md", "docs/domain/GLOSSARY.md", "ADR-0042 is missing its docs/domain/GLOSSARY.md reference");
  requireReference("docs/adr/README.md", "0042-domain-glossary-authority-and-mutability.md", "docs/adr/README.md is missing the ADR-0042 link");
  for (const workflow of ["ci.yml", "pr-checks.yml"]) {
    requireReference(`.github/workflows/${workflow}`, "pnpm check:glossary", `.github/workflows/${workflow} is missing pnpm check:glossary`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Domain glossary: ok (${termCount} terms)`);
}
