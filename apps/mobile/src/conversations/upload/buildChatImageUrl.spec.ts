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
    expect(buildChatImageUrl("abc.jpg")).toBe("https://cdn.example.com/chat-attachments/abc.jpg");
  });

  it("strips a trailing slash from the media URL", async () => {
    process.env["EXPO_PUBLIC_MEDIA_URL"] = "https://cdn.example.com/";
    const { buildChatImageUrl } = await import("./buildChatImageUrl");
    expect(buildChatImageUrl("abc.jpg")).toBe("https://cdn.example.com/chat-attachments/abc.jpg");
  });
});
