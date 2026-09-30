import { describe, expect, it, vi } from "vitest";
import { Pressable } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import { renderMobile, fireEvent, act } from "../../../test/render";
import type { StagedPhoto } from "../uploadStaging/types";

import Step2Photos from "./Step2Photos";

vi.mock("expo-image-picker", () => ({ launchImageLibraryAsync: vi.fn(), launchCameraAsync: vi.fn() }));
vi.mock("expo-file-system/legacy", () => ({ documentDirectory: "file:///documents/",
  getInfoAsync: vi.fn(async () => ({ exists: true })), copyAsync: vi.fn(async () => {}),
  makeDirectoryAsync: vi.fn(async () => {}), deleteAsync: vi.fn(async () => {}) }));

const photo = (photoId: string, sortOrder: number): StagedPhoto => ({ photoId, sortOrder,
  localUri: `file:///${photoId}.jpg`, state: "attached", retryCount: 0 });
const defaults = () => ({ photos: [], onAddPhoto: vi.fn(async () => {}), onRemovePhoto: vi.fn(),
  onReorderPhotos: vi.fn(), onRetryPhoto: vi.fn(), isCompressing: false, isUploading: false });

describe("Step2Photos", () => {
  it("shows an empty state and photo validation error", () => {
    const screen = renderMobile(<Step2Photos {...defaults()} fieldErrors={{ photos: "Add a photo" }} />);
    expect(screen.getByText("No photos")).toBeTruthy();
    expect(screen.getByText("Add a photo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Camera" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Library" })).toBeTruthy();
  });

  it("reorders photos through the thumbnail drag lifecycle", () => {
    const props = { ...defaults(), photos: [photo("a", 0), photo("b", 1), photo("c", 2)] };
    const screen = renderMobile(<Step2Photos {...props} />);
    // Drag areas have no accessible label. Locate the actual Pressable carrying
    // onLongPress, then send native coordinates through its event handlers.
    const drag = screen.UNSAFE_getAllByType(Pressable).find((node) => node.props.onLongPress);
    if (!drag) throw new Error("Photo drag target missing");
    fireEvent(drag, "longPress", { nativeEvent: { pageX: 10, pageY: 10 } });
    fireEvent(drag, "touchMove", { nativeEvent: { touches: [{ pageX: 130, pageY: 10 }] } });
    fireEvent(drag, "pressOut");
    expect(props.onReorderPhotos).toHaveBeenCalledWith(["b", "a", "c"]);
  });

  it("removes a selected photo and renders the in-progress state", () => {
    const props = { ...defaults(), photos: [photo("a", 0)], isCompressing: true };
    const screen = renderMobile(<Step2Photos {...props} />);
    fireEvent.press(screen.getByLabelText("Remove"));
    expect(props.onRemovePhoto).toHaveBeenCalledWith("a");
    expect(screen.getByText("Compressing...")).toBeTruthy();
  });

  it("copies picker media before adding it and cleans temporary media", async () => {
    const props = defaults();
    vi.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false,
      assets: [{ uri: "file:///picker/a.jpg", width: 100, height: 100 }] });
    const screen = renderMobile(<Step2Photos {...props} />);
    await act(async () => { await fireEvent.press(screen.getByRole("button", { name: "Library" })); });
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({ from: "file:///picker/a.jpg", to: expect.stringContaining("file:///documents/picker-temp/") });
    expect(props.onAddPhoto).toHaveBeenCalledWith(expect.stringContaining("file:///documents/picker-temp/"));
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(props.onAddPhoto.mock.calls[0]?.[0], { idempotent: true });
  });

  it("disables adding at twenty photos", () => {
    const screen = renderMobile(<Step2Photos {...defaults()} photos={Array.from({ length: 20 }, (_, i) => photo(String(i), i))} />);
    expect(screen.getByRole("button", { name: "Camera", disabled: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Library", disabled: true })).toBeTruthy();
    expect(screen.getByText("Maximum 20 photos reached")).toBeTruthy();
  });
});
