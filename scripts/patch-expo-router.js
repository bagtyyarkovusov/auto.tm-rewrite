#!/usr/bin/env node
// Patches expo-router@6.0.23 with missing internal/routing and internal/testing
// modules required by @expo/router-server@55.0.16.
// These modules exist in the GitHub sdk-55 branch but were not included in the npm tarball.
// Remove when upgrading to a fixed expo-router release.

const fs = require("node:fs");
const path = require("node:path");

const resolveModule = (id, ...baseDirs) => {
  const { resolve } = require;
  for (const base of baseDirs) {
    try {
      return resolve(id, { paths: [base] });
    } catch {}
  }
  throw Object.assign(new Error(`Cannot find module '${id}'`), { code: "MODULE_NOT_FOUND" });
};

const writeFileIfChanged = (filePath, content) => {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) {
    return;
  }

  fs.writeFileSync(filePath, content);
};

try {
  const workspaceRoot = path.resolve(__dirname, "..");
  const mobileDir = path.join(workspaceRoot, "apps", "mobile");
  const routerRoot = path.dirname(resolveModule("expo-router/package.json", workspaceRoot, mobileDir));
  const internalDir = path.join(routerRoot, "internal");
  fs.mkdirSync(internalDir, { recursive: true });

  const routingPath = path.join(internalDir, "routing.js");
  writeFileIfChanged(
    routingPath,
    [
      '"use strict";',
      'const core = require("../build/getRoutesCore");',
      'Object.assign(exports, core, require("../build/getRoutes"), require("../build/matchers"), require("../build/sortRoutes"));',
      "exports.getRoutesCore = core.getRoutes;",
      "",
    ].join("\n")
  );

  const testingPath = path.join(internalDir, "testing.js");
  writeFileIfChanged(
    testingPath,
    [
      '"use strict";',
      'const contextStubs = require("../build/testing-library/context-stubs");',
      'const requireContext = contextStubs.requireContext || require("../build/testing-library/require-context-ponyfill").default;',
      "Object.assign(exports, contextStubs, { requireContext, default: requireContext });",
      "",
    ].join("\n")
  );
} catch (err) {
  // Not an error if expo-router isn't installed
  if (err.code !== "MODULE_NOT_FOUND") {
    console.error("[expo-router-patch] failed:", err.message);
  }
}
