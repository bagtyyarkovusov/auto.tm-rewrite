import { describe, it, expect, vi, beforeEach } from "vitest";

import { act, fireEvent, renderMobile, routeParams, routerMock } from "../../../../apps/mobile/test/render";
import EditListingScreen from "../../../../apps/mobile/app/listings/[id]/edit";

const fixture = vi.hoisted(() => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  const media = [{ id, kind: "image", key: "photo.jpg", variants: {
    thumbnail: "t.jpg", list: "l.jpg", detail: "d.jpg", fullscreen: "f.jpg",
  }, sortOrder: 0 }];
  return {
    id, save: vi.fn().mockResolvedValue(undefined), show: vi.fn(),
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
vi.mock("../../../../apps/mobile/src/api/listings/useListingDetail", () => ({ useListingDetail: () => ({ data: fixture.listing }) }));
vi.mock("../../../../apps/mobile/src/listings/uploadStaging/useUploadQueue", () => ({ useUploadQueue: () => ({
  photos: fixture.photos, publishGate: { canPublish: true, blockers: [] },
}) }));
vi.mock("../../../../apps/mobile/src/listings/edit/useSaveListingEdit", () => ({
  useSaveListingEdit: () => ({ save: fixture.save, retry: vi.fn(), status: "idle", isPending: false, error: null }),
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
vi.mock("../../../../apps/mobile/src/listings/wizard/Step1Vin", () => ({ default: () => null }));
vi.mock("../../../../apps/mobile/src/listings/wizard/Step2Photos", () => ({ default: () => null }));
vi.mock("../../../../apps/mobile/src/listings/wizard/Step3VehicleId", () => ({ default: () => null }));
vi.mock("../../../../apps/mobile/src/listings/wizard/Step5Price", () => ({ default: () => null }));
vi.mock("../../../../apps/mobile/src/listings/wizard/Step6Location", () => ({ default: () => null }));
vi.mock("../../../../apps/mobile/src/listings/wizard/Step7DescContact", () => ({ default: () => null }));
vi.mock("../../../../apps/mobile/src/api/catalog/useBrands", () => ({ useBrands: () => ({ data: { items: [] } }) }));
vi.mock("../../../../apps/mobile/src/api/catalog/useModels", () => ({ useModels: () => ({ data: { items: [] } }) }));
vi.mock("../../../../apps/mobile/src/api/catalog/useColors", () => ({ useColors: () => ({ data: { items: [] } }) }));
vi.mock("../../../../apps/mobile/src/api/catalog/useBodyTypes", () => ({ useBodyTypes: () => ({ data: { items: [] } }) }));
vi.mock("../../../../apps/mobile/src/api/catalog/useTransmissions", () => ({ useTransmissions: () => ({ data: { items: [] } }) }));
vi.mock("../../../../apps/mobile/src/api/catalog/useDriveTypes", () => ({ useDriveTypes: () => ({ data: { items: [] } }) }));
vi.mock("../../../../apps/mobile/src/api/catalog/useEngineTypes", () => ({ useEngineTypes: () => ({ data: { items: [] } }) }));
vi.mock("../../../../apps/mobile/src/api/catalog/useRegions", () => ({ useRegions: () => ({ data: { items: [] } }) }));
vi.mock("../../../../apps/mobile/src/api/catalog/useCities", () => ({ useCities: () => ({ data: { items: [] } }) }));

beforeEach(() => { routeParams.id = fixture.id; fixture.save.mockClear(); });

describe("edit refresh state boundary", () => {
 it("retains an unsaved condition choice when listing refetch returns a new object", async () => {
  const screen = renderMobile(<EditListingScreen />);
  fireEvent.press(screen.getByRole("radio", { name: "Damaged / needs repair: Yes" }));
  expect(screen.getByRole("radio", { name: "Damaged / needs repair: Yes", checked: true })).toBeTruthy();
  fixture.listing = { ...fixture.listing, favoriteCount: 1 };
  screen.rerender(<EditListingScreen />);
  expect(screen.getByRole("radio", { name: "Damaged / needs repair: Yes", checked: true })).toBeTruthy();
 });
});
