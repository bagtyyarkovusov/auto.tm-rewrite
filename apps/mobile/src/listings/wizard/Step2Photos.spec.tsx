import { describe, expect, it, vi } from "vitest";
import { Pressable, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import { renderMobile, fireEvent, act, first, within } from "../../../test/render";
import type { StagedPhoto } from "../uploadStaging/types";

import Step2Photos from "./Step2Photos";

vi.mock("expo-image-picker", () => ({ launchImageLibraryAsync: vi.fn(), launchCameraAsync: vi.fn() }));
vi.mock("expo-file-system/legacy", () => ({ documentDirectory: "file:///documents/",
  getInfoAsync: vi.fn(async () => ({ exists: true })), copyAsync: vi.fn(async () => {}),
  makeDirectoryAsync: vi.fn(async () => {}), deleteAsync: vi.fn(async () => {}) }));

const photo = (photoId: string, sortOrder: number): StagedPhoto => ({ photoId, sortOrder,
  localUri: `file:///${photoId}.jpg`, state: "attached", retryCount: 0 });
const defaults = () => ({ photos: [], onAddPhoto: vi.fn<(uri: string) => Promise<void>>(async () => {}), onRemovePhoto: vi.fn(),
  onReorderPhotos: vi.fn(), onRetryPhoto: vi.fn(), isCompressing: false, isUploading: false });

describe("Step2Photos", () => {
  it("shows an empty state and photo validation error", () => {
    const screen = renderMobile(<Step2Photos {...defaults()} fieldErrors={{ photos: "Add a photo" }} showErrors />);
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
    const tileStyle = () => StyleSheet.flatten(screen.UNSAFE_getAllByType(View)
      .find((node) => StyleSheet.flatten(node.props.style)?.width === 111)?.props.style);
    expect(tileStyle()?.transform).toEqual([{ translateX: 120 }, { translateY: 0 }, { scale: 1.04 }]);
    fireEvent(drag, "pressOut");
    expect(tileStyle()?.transform).toBeUndefined();
    expect(props.onReorderPhotos).toHaveBeenCalledWith(["b", "a", "c"]);
  });

  it("removes a selected photo and renders the in-progress state", () => {
    const props = { ...defaults(), photos: [photo("a", 0)], isCompressing: true };
    const screen = renderMobile(<Step2Photos {...props} />);
    fireEvent.press(screen.getByLabelText("Remove: Photo 1 of 1"));
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

const inState = (photoId: string, sortOrder: number, state: StagedPhoto["state"], extra: Partial<StagedPhoto> = {}): StagedPhoto =>
  ({ ...photo(photoId, sortOrder), state, ...extra });
const failedWith = (photoId: string, sortOrder: number, message: string, retryable: boolean): StagedPhoto =>
  inState(photoId, sortOrder, "failed", { retryCount: 1, error: { code: retryable ? "NETWORK_ERROR" : "LOCAL_FILE_MISSING", message, retryable } });
const NETWORK = "No internet connection — will retry automatically";
const MISSING = "Photo missing — remove and re-select";
const LOST = "The file is no longer on this phone. Remove it and add it again.";

describe("Step2Photos tile labels", () => {
  it("announces each tile as Photo N of M, with Cover on the first and its upload state", () => {
    const photos = [
      photo("a", 0), inState("b", 1, "uploading"), inState("c", 2, "selected"), inState("d", 3, "compressed"),
      inState("e", 4, "waiting_for_network"), failedWith("f", 5, NETWORK, true), inState("g", 6, "lost"),
    ];
    const screen = renderMobile(<Step2Photos {...defaults()} photos={photos} />);

    expect(screen.getByLabelText("Photo 1 of 7, Cover, Uploaded")).toBeTruthy();
    expect(screen.getByLabelText("Photo 2 of 7, Uploading")).toBeTruthy();
    expect(screen.getByLabelText("Photo 3 of 7, Compressing")).toBeTruthy();
    expect(screen.getByLabelText("Photo 4 of 7, In queue")).toBeTruthy();
    expect(screen.getByLabelText("Photo 5 of 7, Waiting for network")).toBeTruthy();
    expect(screen.getByLabelText("Photo 6 of 7, Failed")).toBeTruthy();
    expect(screen.getByLabelText("Photo 7 of 7, Lost")).toBeTruthy();
  });
});

describe("Step2Photos photo actions sheet", () => {
  const three = () => ({ ...defaults(), photos: [photo("a", 0), photo("b", 1), photo("c", 2)] });
  const sheet = (screen: ReturnType<typeof renderMobile>) => within(screen.getByTestId("photo-actions-sheet"));

  it("opens only when a tile is tapped, titled with the photo's position", () => {
    const screen = renderMobile(<Step2Photos {...three()} />);
    expect(screen.queryByTestId("photo-actions-sheet")).toBeNull();

    fireEvent.press(screen.getByLabelText("Photo 2 of 3, Uploaded"));

    expect(screen.getByTestId("photo-actions-sheet")).toBeTruthy();
    expect(sheet(screen).getByText("Photo 2 of 3")).toBeTruthy();
  });

  it("offers Set as cover, Move earlier, Move later and Remove for a middle photo", () => {
    const screen = renderMobile(<Step2Photos {...three()} />);
    fireEvent.press(screen.getByLabelText("Photo 2 of 3, Uploaded"));

    for (const name of ["Set as cover", "Move earlier", "Move later", "Remove"]) {
      expect(sheet(screen).getByRole("button", { name })).toBeTruthy();
    }
    expect(sheet(screen).queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("has no Move earlier or Set as cover on the first photo", () => {
    const screen = renderMobile(<Step2Photos {...three()} />);
    fireEvent.press(screen.getByLabelText("Photo 1 of 3, Cover, Uploaded"));

    expect(sheet(screen).queryByRole("button", { name: "Move earlier" })).toBeNull();
    expect(sheet(screen).queryByRole("button", { name: "Set as cover" })).toBeNull();
    expect(sheet(screen).getByRole("button", { name: "Move later" })).toBeTruthy();
    expect(sheet(screen).getByRole("button", { name: "Remove" })).toBeTruthy();
  });

  it("has no Move later on the last photo", () => {
    const screen = renderMobile(<Step2Photos {...three()} />);
    fireEvent.press(screen.getByLabelText("Photo 3 of 3, Uploaded"));

    expect(sheet(screen).queryByRole("button", { name: "Move later" })).toBeNull();
    expect(sheet(screen).getByRole("button", { name: "Move earlier" })).toBeTruthy();
    expect(sheet(screen).getByRole("button", { name: "Set as cover" })).toBeTruthy();
  });

  it("has neither Move action when there is one photo", () => {
    const screen = renderMobile(<Step2Photos {...defaults()} photos={[photo("a", 0)]} />);
    fireEvent.press(screen.getByLabelText("Photo 1 of 1, Cover, Uploaded"));

    expect(sheet(screen).queryByRole("button", { name: "Move earlier" })).toBeNull();
    expect(sheet(screen).queryByRole("button", { name: "Move later" })).toBeNull();
    expect(sheet(screen).getByRole("button", { name: "Remove" })).toBeTruthy();
  });

  it.each([
    ["Move earlier", "Photo 2 of 3, Uploaded", ["b", "a", "c"]],
    ["Move later", "Photo 2 of 3, Uploaded", ["a", "c", "b"]],
    ["Set as cover", "Photo 3 of 3, Uploaded", ["c", "a", "b"]],
  ])("%s saves the new order and closes the sheet", (action, tile, order) => {
    const props = three();
    const screen = renderMobile(<Step2Photos {...props} />);
    fireEvent.press(screen.getByLabelText(tile));
    fireEvent.press(sheet(screen).getByRole("button", { name: action }));

    expect(props.onReorderPhotos).toHaveBeenCalledWith(order);
    expect(screen.queryByTestId("photo-actions-sheet")).toBeNull();
  });

  it("removes the tapped photo", () => {
    const props = three();
    const screen = renderMobile(<Step2Photos {...props} />);
    fireEvent.press(screen.getByLabelText("Photo 2 of 3, Uploaded"));
    fireEvent.press(sheet(screen).getByRole("button", { name: "Remove" }));

    expect(props.onRemovePhoto).toHaveBeenCalledWith("b");
    expect(screen.queryByTestId("photo-actions-sheet")).toBeNull();
  });

  it("offers Retry, with the reason, for a retryable failure", () => {
    const props = { ...defaults(), photos: [photo("a", 0), failedWith("b", 1, NETWORK, true)] };
    const screen = renderMobile(<Step2Photos {...props} />);
    fireEvent.press(screen.getByLabelText("Photo 2 of 2, Failed"));

    expect(sheet(screen).getByText(NETWORK)).toBeTruthy();
    fireEvent.press(sheet(screen).getByRole("button", { name: "Retry" }));
    expect(props.onRetryPhoto).toHaveBeenCalledWith("b");
    expect(screen.queryByTestId("photo-actions-sheet")).toBeNull();
  });

  it("offers no Retry for a failure that cannot be retried", () => {
    const props = { ...defaults(), photos: [photo("a", 0), failedWith("b", 1, MISSING, false)] };
    const screen = renderMobile(<Step2Photos {...props} />);
    fireEvent.press(screen.getByLabelText("Photo 2 of 2, Failed"));

    expect(sheet(screen).queryByRole("button", { name: "Retry" })).toBeNull();
    expect(sheet(screen).getByRole("button", { name: "Remove" })).toBeTruthy();
  });

  it("still reorders by long-press drag", () => {
    const props = three();
    const screen = renderMobile(<Step2Photos {...props} />);
    const drag = screen.UNSAFE_getAllByType(Pressable).find((node) => node.props.onLongPress);
    if (!drag) throw new Error("Photo drag target missing");
    fireEvent(drag, "longPress", { nativeEvent: { pageX: 10, pageY: 10 } });
    fireEvent(drag, "touchMove", { nativeEvent: { touches: [{ pageX: 130, pageY: 10 }] } });
    fireEvent(drag, "pressOut");

    expect(props.onReorderPhotos).toHaveBeenCalledWith(["b", "a", "c"]);
    expect(screen.queryByTestId("photo-actions-sheet")).toBeNull();
  });
});

describe("Step2Photos failed list", () => {
  const mixed = () => ({
    ...defaults(),
    photos: [photo("a", 0), failedWith("b", 1, NETWORK, true), failedWith("c", 2, MISSING, false), inState("d", 3, "lost")],
  });
  const list = (screen: ReturnType<typeof renderMobile>) => within(screen.getByTestId("failed-photos"));

  it("lists each failed or lost photo with its number and reason", () => {
    const screen = renderMobile(<Step2Photos {...mixed()} />);

    expect(list(screen).getByText(`#2 · ${NETWORK}`)).toBeTruthy();
    expect(list(screen).getByText(`#3 · ${MISSING}`)).toBeTruthy();
    expect(list(screen).getByText(`#4 · ${LOST}`)).toBeTruthy();
    expect(list(screen).queryByText(/#1/)).toBeNull();
  });

  it("offers Retry for a retryable failure and Remove only for file missing and lost", () => {
    const props = mixed();
    const screen = renderMobile(<Step2Photos {...props} />);

    expect(list(screen).getAllByRole("button", { name: /^Retry/ })).toHaveLength(1);
    expect(list(screen).getAllByRole("button", { name: /^Remove/ })).toHaveLength(2);
    fireEvent.press(first(list(screen).getAllByRole("button", { name: /^Retry/ })));
    expect(props.onRetryPhoto).toHaveBeenCalledWith("b");
    fireEvent.press(first(list(screen).getAllByRole("button", { name: /^Remove/ })));
    expect(props.onRemovePhoto).toHaveBeenCalledWith("c");
  });

  it("is read after the grid", () => {
    const screen = renderMobile(<Step2Photos {...mixed()} />);
    const json = JSON.stringify(screen.toJSON());

    expect(json.indexOf("photo-grid")).toBeGreaterThanOrEqual(0);
    expect(json.indexOf("failed-photos")).toBeGreaterThan(json.indexOf("photo-grid"));
  });

  it("is absent when no photo failed", () => {
    const screen = renderMobile(<Step2Photos {...defaults()} photos={[photo("a", 0), inState("b", 1, "uploading")]} />);

    expect(screen.queryByTestId("failed-photos")).toBeNull();
  });
});

describe("Step2Photos while photos upload", () => {
  const KEEP_UPLOADING = "You can continue. Photos keep uploading.";

  it.each(["selected", "compressed", "presigned", "uploading", "waiting_for_network"] as const)(
    "tells the seller to continue while a photo is %s",
    (state) => {
      const screen = renderMobile(<Step2Photos {...defaults()} photos={[inState("a", 0, state)]} />);

      expect(screen.getByText(KEEP_UPLOADING)).toBeTruthy();
    },
  );

  it("says nothing of the kind once every photo is uploaded or failed", () => {
    const screen = renderMobile(
      <Step2Photos {...defaults()} photos={[photo("a", 0), failedWith("b", 1, NETWORK, true)]} />,
    );

    expect(screen.queryByText(KEEP_UPLOADING)).toBeNull();
  });

  it("does not say it where the next step still waits for an uploaded photo", () => {
    const screen = renderMobile(
      <Step2Photos {...defaults()} photos={[inState("a", 0, "uploading")]} continuesWhileUploading={false} />,
    );

    expect(screen.queryByText(KEEP_UPLOADING)).toBeNull();
  });

  it("says it in Russian and Turkmen", () => {
    const photos = [inState("a", 0, "uploading")];
    const ru = renderMobile(<Step2Photos {...defaults()} photos={photos} />, { locale: "ru" });
    expect(ru.getByText("Можно продолжать. Фото загружаются в фоне.")).toBeTruthy();
    const tk = renderMobile(<Step2Photos {...defaults()} photos={photos} />, { locale: "tk" });
    expect(tk.getByText("Dowam edip bilersiňiz. Suratlar ýüklenmegini dowam edýär.")).toBeTruthy();
  });
});

describe("Step2Photos errors", () => {
  const required = { photos: "At least one photo is required" };

  it("says nothing about missing photos when the seller arrives on the step", () => {
    const screen = renderMobile(<Step2Photos {...defaults()} fieldErrors={required} />);

    expect(screen.getByText("No photos")).toBeTruthy();
    expect(screen.queryByText("At least one photo is required")).toBeNull();
  });

  it("says a photo is required once the seller removes the last one", () => {
    const props = { ...defaults(), photos: [photo("a", 0)] };
    const screen = renderMobile(<Step2Photos {...props} />);

    fireEvent.press(screen.getByLabelText("Remove: Photo 1 of 1"));
    expect(props.onRemovePhoto).toHaveBeenCalledWith("a");
    screen.rerender(<Step2Photos {...props} photos={[]} fieldErrors={required} />);

    expect(screen.getByText("At least one photo is required")).toBeTruthy();
  });

  it("says a photo is required after the seller taps Continue", () => {
    const screen = renderMobile(<Step2Photos {...defaults()} fieldErrors={required} showErrors />);

    expect(screen.getByText("At least one photo is required")).toBeTruthy();
  });
});
