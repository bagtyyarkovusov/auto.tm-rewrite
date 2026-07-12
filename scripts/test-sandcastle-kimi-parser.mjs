#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(resolve(repoRoot, "package.json"), "utf8"),
);

const sandcastleSpec =
  packageJson.devDependencies?.["@ai-hero/sandcastle"] ??
  packageJson.dependencies?.["@ai-hero/sandcastle"];

assert.match(
  sandcastleSpec,
  /^file:\.\/vendor\/ai-hero-sandcastle-.+\.tgz$/,
  "Expected @ai-hero/sandcastle to point at a vendored tarball",
);

const tarballPath = resolve(repoRoot, sandcastleSpec.slice("file:./".length));
const tempDir = mkdtempSync(join(tmpdir(), "sandcastle-kimi-parser-"));

try {
  execFileSync("tar", ["-xzf", tarballPath, "-C", tempDir], {
    stdio: "pipe",
  });

  const agentProviderUrl = pathToFileURL(
    join(tempDir, "package", "dist", "AgentProvider.js"),
  ).href;
  const { kimiCode } = await import(agentProviderUrl);
  const parse = kimiCode("kimi-for-coding", {
    captureSessions: false,
  }).parseStreamLine;
  const parseObject = (value) => parse(JSON.stringify(value));

  assert.deepEqual(parseObject({ role: "assistant", content: "Done." }), [
    { type: "text", text: "Done." },
  ]);

  assert.deepEqual(
    parseObject({
      role: "assistant",
      content: [
        { type: "thinking", thinking: "Inspect the repo state." },
        { type: "text", text: "I found the parser." },
      ],
    }),
    [
      { type: "thinking", text: "Inspect the repo state." },
      { type: "text", text: "I found the parser." },
    ],
  );

  assert.deepEqual(
    parseObject({
      role: "assistant",
      tool_calls: [
        {
          type: "function",
          id: "call_1",
          function: {
            name: "Bash",
            arguments: JSON.stringify({ command: "git status --short" }),
          },
        },
      ],
    }),
    [{ type: "tool_call", name: "Bash", args: "git status --short" }],
  );

  assert.deepEqual(
    parseObject({
      role: "assistant",
      tool_calls: [
        {
          type: "function",
          id: "call_2",
          function: {
            name: "Read",
            arguments: JSON.stringify({
              file_path: "dist/AgentProvider.js",
            }),
          },
        },
      ],
    }),
    [{ type: "tool_call", name: "Read", args: "dist/AgentProvider.js" }],
  );

  assert.deepEqual(
    parseObject({
      role: "assistant",
      tool_calls: [
        {
          type: "function",
          id: "call_3",
          function: {
            name: "Grep",
            arguments: JSON.stringify({
              pattern: "parseKimiStreamLine",
              path: "dist/AgentProvider.js",
            }),
          },
        },
      ],
    }),
    [
      {
        type: "tool_call",
        name: "Grep",
        args: "parseKimiStreamLine in dist/AgentProvider.js",
      },
    ],
  );

  assert.deepEqual(
    parseObject({
      role: "tool",
      tool_call_id: "call_1",
      content: " M .sandcastle/main.mts\n M docs/agents/sandcastle.md\n",
    }),
    [
      {
        type: "tool_result",
        summary: "M .sandcastle/main.mts (3 lines)",
        isError: false,
      },
    ],
  );

  assert.deepEqual(
    parseObject({
      role: "meta",
      type: "session.resume_hint",
      session_id: "sess_123",
      command: "kimi -r sess_123",
      content: "To resume this session: kimi -r sess_123",
    }),
    [{ type: "session_id", sessionId: "sess_123" }],
  );

  assert.deepEqual(
    parseObject({
      role: "meta",
      type: "session.resume_hint",
      command: "kimi -r sess_456",
      content: "To resume this session: kimi -r sess_456",
    }),
    [{ type: "session_id", sessionId: "sess_456" }],
  );

  assert.deepEqual(
    parseObject({
      role: "meta",
      type: "turn.step.retrying",
      retry_in_ms: 1000,
    }),
    [{ type: "ignore" }],
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
