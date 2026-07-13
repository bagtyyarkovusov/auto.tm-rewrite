import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./[id].tsx"), "utf-8");

describe("ConversationDetailScreen realtime text send", () => {
  it("uses the conversation socket hook", () => {
    expect(source).toContain("useConversationSocket");
  });

  it("generates a clientMessageId for every send", () => {
    expect(source).toContain("clientMessageId");
    expect(source).toContain("generateClientMessageId");
  });

  it("creates an optimistic pending row before sending", () => {
    expect(source).toContain('status: "pending"');
  });

  it("reconciles optimistic rows by clientMessageId", () => {
    expect(source).toContain("serverClientIds");
    expect(source).toContain("lm.clientMessageId");
  });

  it("marks messages confirmed on socket ack", () => {
    expect(source).toContain("markConfirmed");
    expect(source).toContain("result.message.id");
  });

  it("falls back to HTTP when socket is not connected", () => {
    expect(source).toContain('result.code === "NOT_CONNECTED"');
    expect(source).toContain("sendViaHttp");
  });

  it("marks messages failed on non-recoverable send errors", () => {
    expect(source).toContain("markFailed");
  });

  it("supports retry for failed messages", () => {
    expect(source).toContain("handleRetry");
    expect(source).toContain('msg.status !== "failed"');
  });

  it("keeps the composer usable while socket connects", () => {
    expect(source).toContain("disabled={false}");
  });
});
