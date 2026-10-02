import { describe, expect, it, vi } from "vitest";

import { fireEvent, renderMobile } from "../../../test/render";

import { ConversationFooter } from "./ConversationFooter";

vi.mock("expo-image-picker", () => ({
  useMediaLibraryPermissions: () => [{ granted: true }, vi.fn()],
  launchImageLibraryAsync: vi.fn(),
}));
vi.mock("../upload/chatImageUpload", () => ({
  compressChatImage: vi.fn(),
  getChatImageStagingPath: vi.fn(),
  ensureChatStagingDir: vi.fn(),
}));
vi.mock("expo-file-system/legacy", () => ({ deleteAsync: vi.fn(async () => {}) }));
vi.mock("../../../lib/theme", () => ({
  THEME: { light: { mutedForeground: "0 0% 45%" }, dark: { mutedForeground: "0 0% 60%" } },
}));

const composer = { onSend: vi.fn(), conversationId: "conversation-1" };

describe("ConversationFooter", () => {
  it("shows the composer, with the draft, and no blocked banner", () => {
    const screen = renderMobile(
      <ConversationFooter
        isBlocked={false}
        unblockPending={false}
        onUnblock={vi.fn()}
        peerTyping={false}
        composer={{ ...composer, initialText: "Is it available?" }}
      />,
    );

    expect(screen.getByDisplayValue("Is it available?")).toBeTruthy();
    expect(screen.queryByText("Unblock")).toBeNull();
    expect(screen.queryByText("typing...")).toBeNull();
  });

  it("shows the blocked banner with Unblock, and a disabled composer", () => {
    const onUnblock = vi.fn();
    const screen = renderMobile(
      <ConversationFooter
        isBlocked
        unblockPending={false}
        onUnblock={onUnblock}
        peerTyping={false}
        composer={{ ...composer, disabled: true }}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "Unblock" }));
    expect(onUnblock).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Send message", disabled: true })).toBeTruthy();
  });

  it("shows the typing indicator while the other participant types", () => {
    const screen = renderMobile(
      <ConversationFooter
        isBlocked={false}
        unblockPending={false}
        onUnblock={vi.fn()}
        peerTyping
        composer={composer}
      />,
    );
    expect(screen.getByText("typing...")).toBeTruthy();
  });

  it("has no composer without a signed-in viewer", () => {
    const screen = renderMobile(
      <ConversationFooter isBlocked={false} unblockPending={false} onUnblock={vi.fn()} peerTyping={false} />,
    );
    expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();
  });
});
