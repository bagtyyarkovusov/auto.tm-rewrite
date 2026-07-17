import { describe, it, expect, afterEach, vi } from "vitest";

const originalEnv = process.env;

describe("buildChatImageUrl", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("returns an empty string when EXPO_PUBLIC_MEDIA_URL is unset", async () => {
    delete process.env["EXPO_PUBLIC_MEDIA_URL"];
    const { buildChatImageUrl } = await import("./buildChatImageUrl");
    expect(buildChatImageUrl("abc.jpg")).toBe("");
  });

  it("builds a URL from the media URL and key", async () => {
    process.env["EXPO_PUBLIC_MEDIA_URL"] = "https://cdn.example.com";
    const { buildChatImageUrl } = await import("./buildChatImageUrl");
    expect(buildChatImageUrl("chat-attachments/conv-1/key/original.jpg")).toBe(
      "https://cdn.example.com/chat-attachments/conv-1/key/original.jpg",
    );
  });

  it("strips a trailing slash from the media URL", async () => {
    process.env["EXPO_PUBLIC_MEDIA_URL"] = "https://cdn.example.com/";
    const { buildChatImageUrl } = await import("./buildChatImageUrl");
    expect(buildChatImageUrl("chat-attachments/conv-1/key/original.jpg")).toBe(
      "https://cdn.example.com/chat-attachments/conv-1/key/original.jpg",
    );
  });
});
