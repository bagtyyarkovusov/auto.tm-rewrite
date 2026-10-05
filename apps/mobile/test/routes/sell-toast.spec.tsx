import { StyleSheet } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SellScreen from "../../app/(tabs)/sell";
import { act, fireEvent, renderMobile, routeParams, routerMock, within } from "../render";

import { ToastProvider } from "@/components/ui/toast";

const fixture = vi.hoisted(() => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  const photos = [{ photoId: id, key: "photo.jpg", sortOrder: 0, state: "uploaded" }];
  return {
    id, photos, publish: vi.fn(), forceSave: vi.fn(), flush: vi.fn(), save: vi.fn(),
    drafts: { items: [{ id, payload: {
      currentStep: 8, validatedSteps: ["vin", "photos", "vehicle", "specs", "price", "location", "contact"],
      photos, brandId: id, modelId: id, year: 2020, condition: "used", mileageKm: 10000,
      conditionDisclosure: { damaged: false }, priceAmount: 100000, priceCurrency: "TMT",
      regionId: id, cityId: id, description: "Great car", contactPhone: "+99361234567",
      allowCalls: true, allowChat: true,
    } }] },
  };
});
vi.mock("@react-navigation/native", async () => ({ NavigationContext: (await import("react")).createContext(null) }));
vi.mock("react-native-safe-area-context", async () => ({
  SafeAreaView: (await import("react-native")).View,
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));
vi.mock("@/components/ui/progress", async () => ({ Progress: (await import("react-native")).View }));
vi.mock("../../src/auth/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("../../src/api/listings/useMyDrafts", () => ({ useMyDrafts: () => ({ data: fixture.drafts }) }));
vi.mock("../../src/api/listings/useCreateDraft", () => ({ useCreateDraft: () => ({ mutate: vi.fn() }) }));
vi.mock("../../src/api/listings/useDiscardDraft", () => ({ useDiscardDraft: () => ({ mutate: vi.fn() }) }));
vi.mock("../../src/api/listings/usePublishDraft", () => ({ usePublishDraft: () => ({ mutateAsync: fixture.publish }) }));
vi.mock("../../src/listings/wizard/useWizardAutosave", () => ({ useWizardAutosave: () => ({
  save: fixture.save, forceSave: fixture.forceSave, flush: fixture.flush, retrySave: vi.fn(), saveStatus: "saved", saveError: null,
}) }));
vi.mock("../../src/listings/uploadStaging/useUploadQueue", () => ({ useUploadQueue: () => ({
  photos: fixture.photos, isReady: true, publishGate: { canPublish: true, blockers: [] },
}) }));
vi.mock("../../src/listings/uploadStaging/stagingDir", () => ({ deleteDraftDir: vi.fn() }));
vi.mock("../../components/auth/SignInDialog", () => ({ SignInDialog: () => null }));
vi.mock("../../src/api/catalog/useBrands", () => ({ useBrands: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useModels", () => ({ useModels: () => ({ data: { items: [] } }) }));
vi.mock("../../src/listings/wizard/Step1Vin", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step2Photos", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step3VehicleId", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step4Specs", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step5Price", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step6Location", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step7DescContact", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/CheckAndPublish", () => ({ default: () => null }));

beforeEach(() => {
  routeParams.resumeDraftId = fixture.id;
  fixture.publish.mockReset().mockRejectedValue(new Error("Publish failed"));
  fixture.forceSave.mockReset().mockResolvedValue(undefined);
  // The save before publishing goes through.
  fixture.flush.mockReset().mockResolvedValue(true);
});

function renderWizard() {
  const screen = renderMobile(<ToastProvider><SellScreen /></ToastProvider>);
  const top = () => StyleSheet.flatten(screen.getByTestId("toast-viewport-top").props.style).top;
  return { screen, top };
}

describe("Sell publish toasts", () => {
  // #588: a failure is worded above Publish, where it stays; it is no longer a toast
  // that had to be kept clear of the wizard header.
  it("shows a publish failure above Publish, not as a toast, and keeps the wizard open", async () => {
    const { screen } = renderWizard();
    await act(async () => { fireEvent.press(screen.getByRole("button", { name: "Publish" })); });

    const message = "Could not publish. Your draft is saved. Try again.";
    expect(within(screen.getByRole("alert")).getByText(message)).toBeTruthy();
    expect(screen.getAllByText(message)).toHaveLength(1);
    expect(screen.queryByText("Publish failed")).toBeNull();
    expect(screen.getByText("Check and publish")).toBeTruthy();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("uses ordinary clearance for the success toast on the destination screen", async () => {
    fixture.publish.mockResolvedValue({ id: fixture.id });
    const { screen, top } = renderWizard();
    await act(async () => { fireEvent.press(screen.getByRole("button", { name: "Publish" })); });
    expect(routerMock.replace).toHaveBeenCalledWith(`/(public)/listings/${fixture.id}`);
    expect(screen.getByText("Listing published")).toBeTruthy();
    expect(top()).toBe(59 + 64 + 8);
  });
});
