import { describe, it, expect, vi, beforeEach } from "vitest";

import { act, fireEvent, renderMobile, routeParams, routerMock } from "../render";
import EditListingScreen from "../../app/listings/[id]/edit";

const fixture = vi.hoisted(() => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  const media = [{ id, kind: "image", key: "photo.jpg", variants: {
    thumbnail: "t.jpg", list: "l.jpg", detail: "d.jpg", fullscreen: "f.jpg",
  }, sortOrder: 0 }];
  return {
    id, save: vi.fn().mockResolvedValue(undefined), show: vi.fn(),
    retry: vi.fn().mockResolvedValue(undefined),
    saveState: { status: "idle", error: null, opStates: {} } as {
      status: string; error: Error | null; opStates: Record<string, string>;
    },
    listing: { id, sellerId: id, publicNumber: 458, status: "active", brandId: id, modelId: id,
      year: 2020, condition: "used", mileageKm: 10000, priceAmount: 100000, priceCurrency: "TMT",
      displayPriceTmt: 100000, description: "Legacy listing", regionId: id, cityId: id,
      allowCalls: true, allowChat: true, acceptsExchange: false, installmentAvailable: false,
      media, viewCount: 0, favoriteCount: 0, publishedAt: "2026-09-30T00:00:00.000Z",
      createdAt: "2026-09-30T00:00:00.000Z", updatedAt: "2026-09-30T00:00:00.000Z",
      seller: { displayName: "Seller", memberSince: "2026-01-01T00:00:00.000Z" },
    },
    photos: [{ photoId: id, key: "photo.jpg", state: "uploaded", sortOrder: 0, retryCount: 0 }],
  };
});
vi.mock("../../src/api/listings/useListingDetail", () => ({ useListingDetail: () => ({ data: fixture.listing }) }));
vi.mock("../../src/listings/uploadStaging/useUploadQueue", () => ({ useUploadQueue: () => ({
  photos: fixture.photos, publishGate: { canPublish: true, blockers: [] },
}) }));
vi.mock("../../src/listings/edit/useSaveListingEdit", () => ({
  useSaveListingEdit: () => ({
    save: fixture.save, retry: fixture.retry, isPending: false, ...fixture.saveState,
  }),
  opLabel: (id: string) => id,
}));
vi.mock("lucide-react-native", async () => {
  const Icon = (await import("react-native")).View;
  return { Check: Icon, AlertCircle: Icon, Eye: Icon, ListChecks: Icon, X: Icon, ChevronLeft: Icon, RefreshCw: Icon };
});
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ show: fixture.show }) }));
vi.mock("react-native-safe-area-context", async () => ({
  SafeAreaView: (await import("react-native")).View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("@/components/ui/progress", async () => ({ Progress: (await import("react-native")).View }));
vi.mock("../../src/listings/wizard/Step1Vin", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step2Photos", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step3VehicleId", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step5Price", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step6Location", () => ({ default: () => null }));
vi.mock("../../src/listings/wizard/Step7DescContact", () => ({ default: () => null }));
vi.mock("../../src/api/catalog/useBrands", () => ({ useBrands: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useModels", () => ({ useModels: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useColors", () => ({ useColors: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useBodyTypes", () => ({ useBodyTypes: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useTransmissions", () => ({ useTransmissions: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useDriveTypes", () => ({ useDriveTypes: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useEngineTypes", () => ({ useEngineTypes: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useRegions", () => ({ useRegions: () => ({ data: { items: [] } }) }));
vi.mock("../../src/api/catalog/useCities", () => ({ useCities: () => ({ data: { items: [] } }) }));

beforeEach(() => {
  routeParams.id = fixture.id;
  fixture.save.mockClear();
  fixture.retry.mockReset().mockResolvedValue(undefined);
  fixture.show.mockClear();
  routerMock.replace.mockClear();
  fixture.saveState = { status: "idle", error: null, opStates: {} };
});

describe("legacy Listing edit", () => {
  it.each(["Yes", "No"])("asks for Damaged before saving and accepts %s", async (answer) => {
    const screen = renderMobile(<EditListingScreen />);
    expect(screen.getByText("Answer whether the car is damaged or needs repair")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Damaged / needs repair: Yes", checked: false })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Damaged / needs repair: No", checked: false })).toBeTruthy();
    const done = screen.getByRole("button", { name: "Done", disabled: true });
    expect.soft(done.props.className.split(" ")).toContain("w-full");
    expect.soft(done.props.className.split(" ")).not.toContain("flex-1");
    fireEvent.press(done);
    expect(fixture.save).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    fireEvent.press(screen.getByRole("radio", { name: `Damaged / needs repair: ${answer}` }));
    expect(screen.queryByText("Answer whether the car is damaged or needs repair")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Done", disabled: false }));
    expect(screen.getByText(`Damaged / needs repair: ${answer}`)).toBeTruthy();
    const save = screen.getByRole("button", { name: "Save changes", disabled: false });
    expect.soft(save.props.className.split(" ")).toContain("w-full");
    expect.soft(save.props.className.split(" ")).not.toContain("flex-1");
    await act(async () => fireEvent.press(save));
    expect(fixture.save).toHaveBeenCalledOnce();
    expect(routerMock.replace).toHaveBeenCalledWith(`/(public)/listings/${fixture.id}`);
  });

  describe("after a partial save failure", () => {
    function renderFailedReview() {
      fixture.saveState = {
        status: "failed",
        error: new Error("Edit session failed at operation reorder"),
        opStates: { fields: "succeeded", [`attach:local`]: "succeeded", reorder: "failed" },
      };
      const screen = renderMobile(<EditListingScreen />);
      fireEvent.press(screen.getByRole("radio", { name: "Damaged / needs repair: No" }));
      fireEvent.press(screen.getByRole("button", { name: "Done", disabled: false }));
      return screen;
    }

    function retryButton(screen: ReturnType<typeof renderMobile>, index: number) {
      const button = screen.getAllByRole("button", { name: "Retry" }).at(index);
      if (!button) throw new Error(`No Retry button at ${index}`);
      return button;
    }

    it("shows which operations succeeded and failed", () => {
      const screen = renderFailedReview();
      expect(screen.getByText("✓ attach:local")).toBeTruthy();
      expect(screen.getByText("✗ reorder")).toBeTruthy();
    });

    it.each([0, 1])("leaves the edit screen once Retry %i completes the remaining operations", async (entry) => {
      const screen = renderFailedReview();
      await act(async () => fireEvent.press(retryButton(screen, entry)));
      expect(fixture.retry).toHaveBeenCalledOnce();
      expect(fixture.save).not.toHaveBeenCalled();
      expect(fixture.show).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
      expect(routerMock.replace).toHaveBeenCalledWith(`/(public)/listings/${fixture.id}`);
    });

    it.each([0, 1])("stays on the edit screen when Retry %i fails again", async (entry) => {
      fixture.retry.mockRejectedValue(new Error("still failing"));
      const screen = renderFailedReview();
      await act(async () => fireEvent.press(retryButton(screen, entry)));
      expect(fixture.retry).toHaveBeenCalledOnce();
      expect(fixture.show).not.toHaveBeenCalled();
      expect(routerMock.replace).not.toHaveBeenCalled();
      expect(screen.getByText("✗ reorder")).toBeTruthy();
    });
  });
});
