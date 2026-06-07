// Relocated out of `app/` (was app/(tabs)/chat.spec.tsx): a *.spec under the Expo
// Router app dir gets bundled by require.context — importing Node `fs` breaks the
// native bundle and registers a bogus route. Test files must live outside `app/`
// (Expo Router docs); metro.config.js resolver.blockList is the backstop. Node/vitest.
import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "../../app/(tabs)/chat.tsx"),
  "utf-8",
);

describe("ChatScreen", () => {
  it("exports default screen component", () => {
    expect(source).toContain("export default function ChatScreen");
  });

  it("uses useAuth for authentication check", () => {
    expect(source).toContain('import { useAuth } from "../../src/auth/useAuth"');
    expect(source).toContain("const { isAuthenticated } = useAuth()");
  });

  it("shows anonymous auth entry when not authenticated", () => {
    expect(source).toContain("isAuthenticated === false");
    expect(source).toContain("AnonymousChatEntry");
  });

  it("stores auth intent to return to chat after login", () => {
    expect(source).toContain(
      'import { useAuthIntentStore } from "../../src/auth/intentStore"',
    );
    expect(source).toContain("useAuthIntentStore.getState().setIntent");
    expect(source).toContain('returnPath: "/(tabs)/chat"');
  });

  it("routes anonymous user to phone auth on sign-in tap", () => {
    expect(source).toContain('router.push("/(auth)/phone")');
  });

  it("shows loading state while auth is resolving", () => {
    expect(source).toContain("isAuthenticated === true");
    expect(source).toContain("Loading…");
  });

  it("renders ConversationList for authenticated users", () => {
    expect(source).toContain(
      'import { ConversationList } from "../../src/conversations/components/ConversationList"',
    );
    expect(source).toContain("<ConversationList />");
  });

  it("has a Messages header", () => {
    expect(source).toContain("Messages");
    expect(source).toContain("text-2xl font-semibold");
  });
});
