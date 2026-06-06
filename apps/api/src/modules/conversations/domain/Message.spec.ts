import { describe, it, expect } from "vitest";
import { Message } from "./Message";
import { CONVERSATION_ERROR_CODES } from "./types";

function makeMessage(
  overrides: Partial<{
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    createdAt: Date;
  }> = {},
): Message {
  return Message.create({
    id: "msg-1",
    conversationId: "conv-1",
    senderId: "sender-1",
    text: "Hello",
    ...overrides,
  });
}

describe("Message", () => {
  describe("text validation", () => {
    it("rejects blank-after-trim text", () => {
      expect(() => makeMessage({ text: "   " })).toThrowError(
        CONVERSATION_ERROR_CODES.MESSAGE_TEXT_BLANK,
      );
    });

    it("rejects empty text", () => {
      expect(() => makeMessage({ text: "" })).toThrowError(
        CONVERSATION_ERROR_CODES.MESSAGE_TEXT_BLANK,
      );
    });

    it("rejects text longer than 1000 chars after trim", () => {
      expect(() => makeMessage({ text: "a".repeat(1001) })).toThrowError(
        CONVERSATION_ERROR_CODES.MESSAGE_TEXT_TOO_LONG,
      );
    });

    it("accepts text at exactly 1000 chars after trim", () => {
      const msg = makeMessage({ text: "a".repeat(1000) });
      expect(msg.text).toBe("a".repeat(1000));
    });

    it("trims leading and trailing whitespace", () => {
      const msg = makeMessage({ text: "  hello world  " });
      expect(msg.text).toBe("hello world");
    });

    it("preserves internal line breaks", () => {
      const text = "line one\nline two\nline three";
      const msg = makeMessage({ text });
      expect(msg.text).toBe(text);
    });

    it("accepts text at exactly 1000 chars after trimming whitespace", () => {
      const msg = makeMessage({ text: "  " + "a".repeat(1000) + "  " });
      expect(msg.text).toBe("a".repeat(1000));
    });

    it("rejects text that is blank after trimming mixed whitespace", () => {
      expect(() => makeMessage({ text: "\n\t \r" })).toThrowError(
        CONVERSATION_ERROR_CODES.MESSAGE_TEXT_BLANK,
      );
    });
  });
});
