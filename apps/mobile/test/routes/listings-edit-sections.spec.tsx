import * as RN from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { waitFor } from "@testing-library/react-native";

import EditListingScreen from "../../app/listings/[id]/edit";
import { server } from "../msw";
import { act, fireEvent, renderMobile, routeParams, routerMock, screenFocus } from "../render";

import { ToastProvider } from "@/components/ui/toast";

// Editing a published Listing from its section list (#589), with the real route,
// wizard machine, upload queue, save orchestration, steps and toast. Only the
// device and the network are faked: the session store, the file system, and the
// API through the fake server.

const pressHardwareBack = (RN as unknown as { pressHardwareBack: () => boolean }).pressHardwareBack;

const fixture = vi.hoisted(() => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  const coverId = "550e8400-e29b-41d4-a716-446655440001";
  const secondId = "550e8400-e29b-41d4-a716-446655440002";
  return { id, coverId, secondId };
});

vi.mock("../../src/auth/session", () => ({
  loadAuthSession: vi.fn(() => Promise.resolve({
    accessToken: "token-123", refreshToken: "refresh-123",
    user: { id: "u1", phone: "+99361000000", displayName: null, role: "seller" },
    storedAt: new Date().toISOString(),
  })),
  storeAuthSession: vi.fn(() => Promise.resolve()),
  clearAuthSession: vi.fn(() => Promise.resolve()),
  subscribeAuthSession: vi.fn(() => () => {}),
}));
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///doc/",
  FileSystemUploadType: { BINARY_CONTENT: "BINARY_CONTENT" },
  getInfoAsync: vi.fn(async (uri: string) => ({ exists: false, uri })),
  readDirectoryAsync: vi.fn(async () => []),
  deleteAsync: vi.fn(async () => undefined),
  makeDirectoryAsync: vi.fn(async () => undefined),
  copyAsync: vi.fn(async () => undefined),
  uploadAsync: vi.fn(),
}));
vi.mock("expo-image-picker", () => ({ launchImageLibraryAsync: vi.fn(), launchCameraAsync: vi.fn() }));
vi.mock("expo-image-manipulator", () => ({ SaveFormat: { JPEG: "jpeg" }, ImageManipulator: { manipulate: vi.fn() } }));
// The app-state and connectivity listeners are the OS's; nothing fires them here.
vi.mock("../../src/listings/uploadStaging/appStateResume", () => ({ setupUploadResume: () => () => undefined }));
vi.mock("@react-native-community/netinfo", () => ({ default: { addEventListener: () => () => {} } }));
// Native primitives the Node adapter cannot load.
vi.mock("@/components/ui/switch", async () => ({ Switch: (await import("react-native")).View }));
vi.mock("@/components/ui/progress", async () => ({ Progress: (await import("react-native")).View }));
vi.mock("react-native-safe-area-context", async () => ({
  SafeAreaView: (await import("react-native")).View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const { id, coverId, secondId } = fixture;
const variants = { thumbnail: "t.jpg", list: "l.jpg", detail: "d.jpg", fullscreen: "f.jpg" };
type Screen = ReturnType<typeof renderMobile>;

/** The published Listing on the fake server, and what the app sent to change it. */
function createListingApi(overrides: Record<string, unknown> = {}) {
  const listing: Record<string, unknown> = {
    id, sellerId: id, publicNumber: 458, status: "active", brandId: id, modelId: id,
    year: 2020, vin: "WBA1234567890ABCD", condition: "used", mileageKm: 10000,
    priceAmount: 100000, priceCurrency: "TMT", displayPriceTmt: 100000,
    description: "One owner", regionId: id, cityId: id,
    contactPhone: "+99361000000", allowCalls: true, allowChat: true,
    acceptsExchange: false, installmentAvailable: false,
    conditionDisclosure: { damaged: false },
    media: [
      { id: coverId, kind: "image", key: `listings/${id}/${coverId}/original.jpg`, variants, sortOrder: 0 },
      { id: secondId, kind: "image", key: `listings/${id}/${secondId}/original.jpg`, variants, sortOrder: 1 },
    ],
    viewCount: 0, favoriteCount: 0, publishedAt: "2026-09-30T00:00:00.000Z",
    createdAt: "2026-09-30T00:00:00.000Z", updatedAt: "2026-09-30T00:00:00.000Z",
    seller: { displayName: "Seller", memberSince: "2026-01-01T00:00:00.000Z" },
    ...overrides,
  };
  const api = { listing, patches: [] as Record<string, unknown>[], removed: [] as string[], failEdits: 0 };
  const named = (name: string) => HttpResponse.json({ items: [{ id, name, slug: name.toLowerCase() }] });

  server.use(
    http.get("*/catalog/brands", () => named("Toyota")),
    http.get("*/catalog/brands/:brandId/models", () => named("Camry")),
    http.get("*/catalog/*", () => HttpResponse.json({ items: [] })),
    http.get("*/exchange-rates*", () => HttpResponse.json({ rates: [] })),
    http.get("*/me/contact-phones", () => HttpResponse.json({ items: [] })),
    http.get("*/listings/:id", () => HttpResponse.json(api.listing)),
    http.patch("*/listings/:id", async ({ request }) => {
      if (api.failEdits > 0) {
        api.failEdits -= 1;
        return HttpResponse.json({ message: "temporarily unavailable" }, { status: 503 });
      }
      const patch = (await request.json()) as Record<string, unknown>;
      api.patches.push(patch);
      Object.assign(api.listing, patch);
      return HttpResponse.json(api.listing);
    }),
    http.delete("*/listings/:id/media/:mediaId", ({ params }) => {
      api.removed.push(String(params.mediaId));
      return HttpResponse.json({ success: true });
    }),
    http.put("*/listings/:id/media/order", () => HttpResponse.json({ success: true })),
  );
  return api;
}

/** Opens the edit screen and waits for the Listing and its photos. */
async function openEdit({ locale = "en", heading = "Edit listing" } = {}) {
  const screen = renderMobile(<ToastProvider><EditListingScreen /></ToastProvider>, { locale });
  await screen.findByRole("header", { name: heading });
  await screen.findByText(/^Photos: 2$|^Фото: 2$|^Suratlar: 2$/);
  return screen;
}

const saveButton = (screen: Screen) => screen.getByRole("button", { name: "Save changes" });
const isDisabled = (button: { props: { accessibilityState?: { disabled?: boolean } } }) =>
  button.props.accessibilityState?.disabled === true;

function openStep(screen: Screen, row: RegExp, header: string) {
  fireEvent.press(screen.getByRole("button", { name: row }));
  expect(screen.getByRole("header", { name: header })).toBeTruthy();
}

/** Types a new amount on the Price step and returns to the list with Done. */
function changePrice(screen: Screen, from: string, to: string) {
  openStep(screen, /^Price, .*Change$/, "Price, Step 4 of 7");
  fireEvent.changeText(screen.getByDisplayValue(from), to);
  fireEvent.press(screen.getByRole("button", { name: "Done" }));
  expect(screen.getByRole("header", { name: "Edit listing" })).toBeTruthy();
}

beforeEach(() => {
  routeParams.id = id;
  routerMock.canGoBack.mockReturnValue(true);
});

describe("the section list of a published Listing (#589)", () => {
  it("opens on the Listing's sections under Edit listing, with the note about saving", async () => {
    createListingApi();
    const screen = await openEdit();

    expect(screen.getByText("Buyers see the changes only after you save.")).toBeTruthy();
    expect(screen.getAllByTestId("check-section")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Price, 100,000 TMT, Change" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Photos, Photos: 2, Change" })).toBeTruthy();
    // Edit has no buyer preview, no Posting rules line and no Publish.
    expect(screen.queryByTestId("check-preview")).toBeNull();
    expect(screen.queryByText("This is how buyers will see your listing")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
    expect(screen.queryByText(/Step 7 of 7/)).toBeNull();
  });

  it.each([
    ["ru", "Редактировать объявление", "Покупатели увидят изменения только после сохранения."],
    ["tk", "Bildirişi redaktirle", "Alyjylar üýtgeşmeleri diňe saklananyňyzdan soň görer."],
  ])("heads the list and words the note in %s", async (locale, heading, note) => {
    createListingApi();
    const screen = await openEdit({ locale, heading });

    expect(screen.getByText(note)).toBeTruthy();
  });
});

describe("the locked Car row (#589)", () => {
  it("has no Change, says why, and is announced as not editable", async () => {
    createListingApi();
    const screen = await openEdit();

    const note = "Brand, model, generation, year and VIN cannot be changed after publishing.";
    expect(screen.getByText(note)).toBeTruthy();
    const row = screen.getByLabelText(`Car, Toyota Camry, 2020 · VIN WBA1234567890ABCD, ${note}`);
    expect(row.props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.queryByRole("button", { name: /^Car, / })).toBeNull();

    // A tap on it opens nothing.
    fireEvent.press(row);
    expect(screen.getByRole("header", { name: "Edit listing" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
  });

  it.each([
    ["ru", "Редактировать объявление", "Марку, модель, поколение, год и VIN нельзя изменить после публикации."],
    ["tk", "Bildirişi redaktirle", "Marka, model, nesil, ýyl we VIN neşirden soň üýtgedilmeýär."],
  ])("says why in %s", async (locale, heading, note) => {
    createListingApi();
    const screen = await openEdit({ locale, heading });

    expect(screen.getByText(note)).toBeTruthy();
  });
});

describe("changing a section (#589)", () => {
  it("Change opens the step with Done, and Done returns to the list with the new value", async () => {
    createListingApi();
    const screen = await openEdit();

    openStep(screen, /^Price, .*Change$/, "Price, Step 4 of 7");
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    fireEvent.changeText(screen.getByDisplayValue("100000"), "179000");
    fireEvent.press(screen.getByRole("button", { name: "Done" }));

    expect(screen.getByRole("header", { name: "Edit listing" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Price, 179,000 TMT, Change" })).toBeTruthy();
  });

  it("keeps the seller on a step that is not valid", async () => {
    createListingApi();
    const screen = await openEdit();

    openStep(screen, /^Price, .*Change$/, "Price, Step 4 of 7");
    fireEvent.changeText(screen.getByDisplayValue("100000"), "");
    const done = screen.getByRole("button", { name: "Done" });
    expect(isDisabled(done)).toBe(true);
    fireEvent.press(done);

    expect(screen.getByRole("header", { name: "Price, Step 4 of 7" })).toBeTruthy();
  });

  it("Back on a step returns to the list and keeps what was typed", async () => {
    createListingApi();
    const screen = await openEdit();

    openStep(screen, /^Price, .*Change$/, "Price, Step 4 of 7");
    fireEvent.changeText(screen.getByDisplayValue("100000"), "179000");
    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("header", { name: "Edit listing" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Price, 179,000 TMT, Change" })).toBeTruthy();
  });
});

describe("Save changes (#589)", () => {
  it("is disabled until a field differs from the published Listing, and again once the change is undone", async () => {
    createListingApi();
    const screen = await openEdit();
    expect(isDisabled(saveButton(screen))).toBe(true);

    changePrice(screen, "100000", "179000");
    expect(isDisabled(saveButton(screen))).toBe(false);

    changePrice(screen, "179000", "100000");
    expect(isDisabled(saveButton(screen))).toBe(true);
  });

  it("does not send anything while nothing changed", async () => {
    const api = createListingApi();
    const screen = await openEdit();

    await act(async () => { fireEvent.press(saveButton(screen)); });

    expect(api.patches).toEqual([]);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("is enabled by a removed photo", async () => {
    createListingApi();
    const screen = await openEdit();

    openStep(screen, /^Photos, .*Change$/, "Photos, Step 3 of 7");
    fireEvent.press(screen.getByRole("button", { name: "Remove: Photo 2 of 2" }));
    fireEvent.press(screen.getByRole("button", { name: "Done" }));

    expect(screen.getByRole("button", { name: "Photos, Photos: 1, Change" })).toBeTruthy();
    expect(isDisabled(saveButton(screen))).toBe(false);
  });

  it("returns to the Listing with a Changes saved toast after a successful save", async () => {
    const api = createListingApi();
    const screen = await openEdit();
    changePrice(screen, "100000", "179000");

    await act(async () => { fireEvent.press(saveButton(screen)); });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(`/(public)/listings/${id}`));
    expect(api.patches).toEqual([expect.objectContaining({ priceAmount: 179000 })]);
    expect(screen.getByText("Changes saved")).toBeTruthy();
  });

  it("a failed save stays on the list with Retry and keeps every change", async () => {
    const api = createListingApi();
    api.failEdits = 1;
    const screen = await openEdit();
    changePrice(screen, "100000", "179000");

    await act(async () => { fireEvent.press(saveButton(screen)); });

    await screen.findByText("Couldn't save all changes. Try again.");
    expect(screen.getByRole("header", { name: "Edit listing" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Price, 179,000 TMT, Change" })).toBeTruthy();
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(screen.queryByText("Changes saved")).toBeNull();

    await act(async () => { fireEvent.press(screen.getByRole("button", { name: "Retry" })); });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(`/(public)/listings/${id}`));
    expect(api.patches).toEqual([expect.objectContaining({ priceAmount: 179000 })]);
  });

  it.each([
    ["ru", "Редактировать объявление", "Сохранить изменения", "Не удалось сохранить все изменения. Попробуйте ещё раз."],
    ["tk", "Bildirişi redaktirle", "Üýtgeşmeleri sakla", "Ähli üýtgeşmeleri saklap bolmady. Täzeden synanyşyň."],
  ])("words a failed save in %s", async (locale, heading, save, message) => {
    const api = createListingApi({ conditionDisclosure: { damaged: true } });
    api.failEdits = 1;
    const screen = await openEdit({ locale, heading });
    // One tap changes the Listing: the seller answers Damaged the other way.
    fireEvent.press(screen.getAllByTestId("check-section")[1] as never);
    fireEvent.press(screen.getAllByRole("radio", { checked: false })[0] as never);
    fireEvent.press(screen.getAllByRole("button").at(-1) as never);

    await act(async () => { fireEvent.press(screen.getByRole("button", { name: save })); });

    expect(await screen.findByText(message)).toBeTruthy();
  });
});

describe("leaving the edit (#589)", () => {
  it("✕ with no changes closes at once", async () => {
    createListingApi();
    const screen = await openEdit();

    fireEvent.press(screen.getByRole("button", { name: "Close" }));

    expect(routerMock.back).toHaveBeenCalledOnce();
    expect(screen.queryByText("Leave edit mode?")).toBeNull();
  });

  it("✕ with changes asks first; Keep editing stays and Leave closes", async () => {
    createListingApi();
    const screen = await openEdit();
    changePrice(screen, "100000", "179000");

    fireEvent.press(screen.getByRole("button", { name: "Close" }));

    expect(screen.getByText("Leave edit mode?")).toBeTruthy();
    expect(screen.getByText("Any unsaved changes will be lost.")).toBeTruthy();
    expect(routerMock.back).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByText("Leave edit mode?")).toBeNull();
    expect(screen.getByRole("button", { name: "Price, 179,000 TMT, Change" })).toBeTruthy();
    expect(routerMock.back).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole("button", { name: "Close" }));
    fireEvent.press(screen.getByRole("button", { name: "Leave" }));
    expect(routerMock.back).toHaveBeenCalledOnce();
  });

  it("system back with no changes closes at once", async () => {
    createListingApi();
    await openEdit();

    let handled = false;
    await act(async () => { handled = pressHardwareBack(); });

    expect(handled).toBe(true);
    expect(routerMock.back).toHaveBeenCalledOnce();
  });

  it("system back with changes asks first, and a second back keeps editing", async () => {
    createListingApi();
    const screen = await openEdit();
    changePrice(screen, "100000", "179000");

    await act(async () => { pressHardwareBack(); });
    expect(screen.getByText("Leave edit mode?")).toBeTruthy();
    expect(routerMock.back).not.toHaveBeenCalled();

    await act(async () => { pressHardwareBack(); });
    expect(screen.queryByText("Leave edit mode?")).toBeNull();
    expect(routerMock.back).not.toHaveBeenCalled();
  });

  it("system back on a step returns to the list, not out of the edit", async () => {
    createListingApi();
    const screen = await openEdit();
    openStep(screen, /^Price, .*Change$/, "Price, Step 4 of 7");

    await act(async () => { pressHardwareBack(); });

    expect(screen.getByRole("header", { name: "Edit listing" })).toBeTruthy();
    expect(routerMock.back).not.toHaveBeenCalled();
  });

  it("leaves system back to a screen opened over the edit", async () => {
    createListingApi();
    screenFocus.focused = false;
    await openEdit();

    let handled = true;
    await act(async () => { handled = pressHardwareBack(); });

    expect(handled).toBe(false);
    expect(routerMock.back).not.toHaveBeenCalled();
  });

  it.each([
    ["ru", "Редактировать объявление", "Закрыть",
      ["Выйти из режима редактирования?", "Несохранённые изменения будут потеряны.", "Выйти", "Продолжить редактирование"]],
    ["tk", "Bildirişi redaktirle", "Ýap",
      ["Redaktirlemeden çykmalymy?", "Saklanmadyk üýtgeşmeler ýitýär.", "Çyk", "Redaktirlemäge dowam et"]],
  ])("asks in %s", async (locale, heading, close, copy) => {
    createListingApi({ conditionDisclosure: { damaged: true } });
    const screen = await openEdit({ locale, heading });
    fireEvent.press(screen.getAllByTestId("check-section")[1] as never);
    fireEvent.press(screen.getAllByRole("radio", { checked: false })[0] as never);
    fireEvent.press(screen.getAllByRole("button").at(-1) as never);

    fireEvent.press(screen.getByRole("button", { name: close }));

    for (const text of copy) expect(screen.getByText(text)).toBeTruthy();
  });
});
