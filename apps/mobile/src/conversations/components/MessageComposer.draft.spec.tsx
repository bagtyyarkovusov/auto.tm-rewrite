import { describe, expect, it, vi } from "vitest";

import { fireEvent, renderMobile } from "../../../test/render";

import { MessageComposer } from "./MessageComposer";

// The real theme module imports React Navigation, which needs the native runtime.
vi.mock("../../../lib/theme", () => ({
  THEME: { light: { mutedForeground: "0 0% 45%" }, dark: { mutedForeground: "0 0% 60%" } },
}));
vi.mock("expo-image-picker", () => ({
  useMediaLibraryPermissions: () => [{ granted: true }, vi.fn()],
  launchImageLibraryAsync: vi.fn(),
}));
vi.mock("expo-file-system/legacy", () => ({ deleteAsync: vi.fn(async () => {}) }));
vi.mock("expo-linking", () => ({ openSettings: vi.fn() }));
vi.mock("../upload/chatImageUpload", () => ({
  compressChatImage: vi.fn(),
  getChatImageStagingPath: vi.fn(),
  ensureChatStagingDir: vi.fn(),
  ChatImageUploadError: class extends Error {},
}));

const DRAFT = "Can I see the car?";

describe("Message composer with a draft from Ask the seller", () => {
  it("starts with the question typed in and sends nothing on its own", () => {
    const onSend = vi.fn();
    const screen = renderMobile(<MessageComposer onSend={onSend} initialText={DRAFT} />);

    expect(screen.getByDisplayValue(DRAFT)).toBeTruthy();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("sends the question when the buyer presses Send, and clears the field", () => {
    const onSend = vi.fn();
    const screen = renderMobile(<MessageComposer onSend={onSend} initialText={DRAFT} />);

    fireEvent.press(screen.getByRole("button", { name: "Send message", disabled: false }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith(DRAFT);
    expect(screen.queryByDisplayValue(DRAFT)).toBeNull();
  });

  it("lets the buyer edit the question before sending", () => {
    const onSend = vi.fn();
    const screen = renderMobile(<MessageComposer onSend={onSend} initialText={DRAFT} />);

    fireEvent.changeText(screen.getByDisplayValue(DRAFT), "Can I see the car on Sunday?");
    fireEvent.press(screen.getByRole("button", { name: "Send message", disabled: false }));

    expect(onSend).toHaveBeenCalledWith("Can I see the car on Sunday?");
  });

  it("starts empty, with Send disabled, when there is no draft", () => {
    const screen = renderMobile(<MessageComposer onSend={vi.fn()} />);

    expect(screen.queryByDisplayValue(DRAFT)).toBeNull();
    expect(screen.getByRole("button", { name: "Send message", disabled: true })).toBeTruthy();
  });
});
