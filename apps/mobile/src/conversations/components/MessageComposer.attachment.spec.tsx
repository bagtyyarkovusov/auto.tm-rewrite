import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, fireEvent, renderMobile } from "../../../test/render";

import { MessageComposer } from "./MessageComposer";

// Native picker/filesystem/manipulator boundaries only. Real composer and
// compression/staging code execute, so the attachment is selected by the user.
const picker = vi.hoisted(() => ({ canceled: false }));
const removedFiles = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("expo-image-picker", () => ({
  useMediaLibraryPermissions: () => [{ granted: true }, async () => ({ granted: true })],
  launchImageLibraryAsync: async () => ({
    canceled: picker.canceled,
    assets: picker.canceled ? [] : [{ uri: "file:///picked.jpg" }],
  }),
}));
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///doc/",
  getInfoAsync: async () => ({ exists: true, size: 1024 }),
  copyAsync: async () => {},
  deleteAsync: removedFiles,
}));
vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: {
    manipulate: () => ({
      resize: () => {},
      renderAsync: async () => ({
        saveAsync: async () => ({ uri: "file:///compressed.jpg", width: 1200, height: 800 }),
      }),
    }),
  },
}));

beforeEach(() => {
  picker.canceled = false;
  removedFiles.mockClear();
});

async function attach(view: ReturnType<typeof renderMobile>, label = "Attach photo") {
  await act(async () => {
    fireEvent.press(view.getByRole("button", { name: label }));
  });
}

describe("Conversation attachment removal", () => {
  it("exposes Remove as a button, clears the attachment and preserves held text", async () => {
    const onSend = vi.fn();
    const onSendImage = vi.fn();
    const view = renderMobile(<MessageComposer conversationId="conversation" onSend={onSend} onSendImage={onSendImage} initialText="Held question" />);
    await attach(view);
    const remove = view.getByRole("button", { name: "Remove" });
    fireEvent.press(remove);
    expect(view.queryByRole("button", { name: "Remove" })).toBeNull();
    expect(view.getByDisplayValue("Held question")).toBeTruthy();
    expect(removedFiles).toHaveBeenLastCalledWith(expect.stringMatching(/^file:\/\/\/doc\/chat-staging\/conversation\/picker-.*\.jpg$/), { idempotent: true });
    fireEvent.press(view.getByRole("button", { name: "Send message", disabled: false }));
    expect(onSend).toHaveBeenCalledWith("Held question");
    expect(onSendImage).not.toHaveBeenCalled();
  });

  it("disables Send again after an image-only attachment is removed", async () => {
    const view = renderMobile(<MessageComposer conversationId="conversation" onSend={vi.fn()} onSendImage={vi.fn()} />);
    await attach(view);
    expect(view.getByRole("button", { name: "Send message", disabled: false })).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Remove" }));
    expect(view.getByRole("button", { name: "Send message", disabled: true })).toBeTruthy();
  });
});
