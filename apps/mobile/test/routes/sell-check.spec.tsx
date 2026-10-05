import { beforeEach, describe, expect, it, vi } from "vitest";

import SellScreen from "../../app/(tabs)/sell";
import { act, fireEvent, renderMobile } from "../render";

// The Sell route on Check and publish, with the real upload queue, wizard machine,
// autosave and Check screen. Only the device and the network are faked: the file
// system, presign and upload, the catalog, and the draft API.
const fixture = vi.hoisted(() => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  const photoId = "11111111-1111-4111-8111-111111111111";
  const savedPhoto = { photoId, key: `${photoId}.jpg`, sortOrder: 0 };
  const complete = {
    brandId: id, modelId: id, year: 2020,
    condition: "used", mileageKm: 10000, conditionDisclosure: { damaged: false },
    photos: [savedPhoto],
    priceAmount: 100000, priceCurrency: "TMT", description: "One owner", regionId: id, cityId: id,
    contactPhone: "+99365000000", allowCalls: true, allowChat: true,
  } as Record<string, unknown>;
  return {
    id,
    photoId,
    savedPhoto,
    complete,
    payload: complete,
    // File names by staging directory, as the device would list them.
    staged: {} as Record<string, string[]>,
    patch: vi.fn(),
    presign: vi.fn(),
    upload: vi.fn(),
    show: vi.fn(),
    mutation: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, error: null },
  };
});
vi.mock("@react-navigation/native", async () => ({
  NavigationContext: (await import("react")).createContext(undefined),
}));
vi.mock("expo-image-picker", () => ({ launchImageLibraryAsync: vi.fn(), launchCameraAsync: vi.fn() }));
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///documents/",
  FileSystemUploadType: { BINARY_CONTENT: "BINARY_CONTENT" },
  getInfoAsync: vi.fn(async () => ({ exists: true, size: 1024 })),
  readDirectoryAsync: vi.fn(async (dir: string) => {
    const key = dir.replace("file:///documents/listing-staging/", "").replace(/\/$/, "");
    return fixture.staged[key] ?? [];
  }),
  uploadAsync: fixture.upload,
  copyAsync: vi.fn(async () => {}), makeDirectoryAsync: vi.fn(async () => {}), deleteAsync: vi.fn(async () => {}),
}));
vi.mock("../../src/listings/uploadStaging/compressor", () => ({
  compressPhoto: vi.fn(), CompressionError: class CompressionError extends Error {},
}));
vi.mock("../../src/api/uploads/usePresignUpload", () => ({
  usePresignUpload: () => ({ mutateAsync: fixture.presign }),
}));
// The app-state and connectivity listeners are the OS's; nothing fires them here.
vi.mock("../../src/listings/uploadStaging/appStateResume", () => ({ setupUploadResume: () => () => {} }));
vi.mock("@react-native-community/netinfo", () => ({ default: { addEventListener: () => () => {} } }));
vi.mock("../../src/api/listings/useUpdateDraft", () => ({ useUpdateDraft: () => ({ mutateAsync: fixture.patch }) }));
vi.mock("../../src/api/listings/useMyDrafts", () => ({
  useMyDrafts: () => ({
    data: { items: [{ id: fixture.id, payload: fixture.payload, updatedAt: "2026-10-01T08:00:00.000Z" }] },
    isPending: false,
  }),
}));
vi.mock("../../src/api/listings/useCreateDraft", () => ({ useCreateDraft: () => fixture.mutation }));
vi.mock("../../src/api/listings/usePublishDraft", () => ({ usePublishDraft: () => fixture.mutation }));
vi.mock("../../src/api/listings/useDiscardDraft", () => ({ useDiscardDraft: () => fixture.mutation }));
vi.mock("../../src/auth/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, phone: "+99365000000" }) }));
vi.mock("../../components/auth/SignInDialog", () => ({ SignInDialog: () => null }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ show: fixture.show, setTopClearance: vi.fn() }) }));
vi.mock("react-native-safe-area-context", async () => ({
  SafeAreaView: (await import("react-native")).View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("@/components/ui/progress", async () => ({ Progress: (await import("react-native")).View }));
vi.mock("../../src/listings/wizard/Step2Photos", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step3VehicleId", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step4Specs", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step5Price", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step6Location", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step7DescContact", () => ({ default: () => null }));
const named = (name: string) => ({ data: { items: [{ id: fixture.id, name }] } });
vi.mock("../../src/api/catalog/useBrands", () => ({ useBrands: () => named("Toyota") }));
vi.mock("../../src/api/catalog/useModels", () => ({ useModels: () => named("Camry") }));
vi.mock("../../src/api/catalog/useGenerations", () => ({ useGenerations: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useTransmissions", () => ({ useTransmissions: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useEngineTypes", () => ({ useEngineTypes: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useCityGroups", () => ({
  useCityGroups: () => ({ groups: [] }),
  findCityInGroups: () => ({ city: { name: "Ashgabat" }, region: { name: "Ahal" } }),
}));

const { id, photoId } = fixture;
type Screen = ReturnType<typeof renderMobile>;

const header = (screen: Screen, name: string) => screen.getByRole("header", { name });
const savedPayloads = () => fixture.patch.mock.calls.map(([request]) => request.payload);
const pause = (ms: number) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });

/** Opens the latest draft from the Sell tab and waits for its photos to be read from the device. */
async function openCheck() {
  const screen = renderMobile(<SellScreen />);
  await pause(20);
  fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  await pause(20);
  header(screen, "Check and publish, Step 7 of 7");
  return screen;
}

beforeEach(() => {
  fixture.payload = fixture.complete;
  fixture.staged = { [`draft-${id}`]: [`${photoId}.jpg`] };
  fixture.patch.mockReset().mockResolvedValue({});
  fixture.presign.mockReset().mockResolvedValue({ uploadUrl: "http://localhost/put", key: "uploaded-again.jpg" });
  fixture.upload.mockReset().mockResolvedValue({ status: 200 });
  fixture.show.mockReset();
  fixture.mutation.mutateAsync.mockReset().mockResolvedValue({ id });
});

describe("Check and publish: changing a step (#588)", () => {
  it("shows the Listing as a card with one row per step", async () => {
    const screen = await openCheck();

    expect(screen.getByText("This is how buyers will see your listing")).toBeTruthy();
    expect(screen.getByTestId("check-preview-cover").props.source.uri).toContain(photoId);
    expect(screen.getAllByTestId("check-section")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Car, Toyota Camry, 2020, Change" })).toBeTruthy();
  });

  it("Change opens the step with Done in place of Continue, and Done returns to Check", async () => {
    const screen = await openCheck();

    fireEvent.press(screen.getByRole("button", { name: /^Price, .*Change$/ }));

    header(screen, "Price, Step 4 of 7");
    expect(screen.getByRole("button", { name: "Done" }).props.accessibilityState).toMatchObject({ disabled: false });
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();

    await act(async () => { fireEvent.press(screen.getByRole("button", { name: "Done" })); });

    header(screen, "Check and publish, Step 7 of 7");
    expect(screen.getByRole("button", { name: "Publish" }).props.accessibilityState).toMatchObject({ disabled: false });
    // Done saved the draft on Check, with its photo and every step still complete.
    expect(savedPayloads().at(-1)).toMatchObject({
      currentStep: 7,
      photos: [fixture.savedPhoto],
      validatedSteps: ["vehicle", "specs", "photos", "price", "location", "contact"],
    });
  });

  it("the header's Back leaves the changed step for Check as well", async () => {
    const screen = await openCheck();
    fireEvent.press(screen.getByRole("button", { name: /^Contact, .*Change$/ }));
    header(screen, "Contact, Step 6 of 7");

    await act(async () => { fireEvent.press(screen.getByRole("button", { name: "Back" })); });

    header(screen, "Check and publish, Step 7 of 7");
  });
});
