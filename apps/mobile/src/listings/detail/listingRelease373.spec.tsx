import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollView, Share, Text } from "react-native";
import * as Linking from "expo-linking";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { renderMobile, fireEvent, act, routeParams, routerMock } from "../../../test/render";
import ListingDetailScreen from "../../../app/(public)/listings/[id]";
import { ListingDetailView } from "../components/ListingDetail";
import { ContactCtaBar } from "../components/ContactCtaBar";

import type { CatalogMaps } from "./useCatalogMaps";

const state = vi.hoisted(() => ({
  data: undefined as ListingsSchemas.ListingDetail | undefined,
  error: null as unknown, isPending: false,
  viewer: null as { userId: string } | null,
  authenticated: true as boolean | null,
  post: vi.fn(), refetch: vi.fn(),
}));
vi.mock("../../api/listings/useListingDetail", () => ({ useListingDetail: () => state }));
vi.mock("../../auth/useViewer", () => ({ useViewer: () => state.viewer }));
vi.mock("../../auth/useAuth", () => ({ useAuth: () => ({ isAuthenticated: state.authenticated }) }));
vi.mock("../../api/admin/useConfig", () => ({ useConfig: () => ({ data: {} }) }));
vi.mock("../../api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/client")>(),
  apiClient: { post: state.post, get: vi.fn(), delete: vi.fn() },
}));
vi.mock("expo-secure-store", () => ({ getItemAsync: vi.fn(async () => null), setItemAsync: vi.fn(), deleteItemAsync: vi.fn() }));
vi.mock("expo-linking", () => ({ canOpenURL: vi.fn(async () => true), openURL: vi.fn(async () => {}) }));
vi.mock("@/components/ui/skeleton", async () => ({ Skeleton: (await import("react-native")).View }));
vi.mock("../../admin/components/ReportSheet", () => ({ ReportSheet: () => null }));
vi.mock("./useCatalogMaps", () => ({ useCatalogMaps: () => ({ maps }) }));

const maps: CatalogMaps = {
  brandName: () => "Toyota", modelName: () => "Camry", generationName: () => "XV70",
  colorName: () => "White", bodyTypeName: () => "Sedan", transmissionName: () => "Automatic",
  driveTypeName: () => "Front wheel", engineTypeName: () => "Petrol",
  regionName: () => "Ahal", cityName: () => "Ashgabat",
};
const fixture = (updates: Partial<ListingsSchemas.ListingDetail> = {}): ListingsSchemas.ListingDetail => ({
  id: "00000000-0000-4000-8000-000000000373", publicNumber: 373,
  sellerId: "00000000-0000-4000-8000-000000000002",
  seller: { displayName: "Merdan", memberSince: "2024-01-01T00:00:00Z" },
  status: "active", brandId: "brand", modelId: "model", generationId: "generation", year: 2020,
  regionId: "region", cityId: "city", priceAmount: 10000, priceCurrency: "USD", displayPriceTmt: 35000,
  allowCalls: true, allowChat: true, contactPhone: "+99361000000", acceptsExchange: false,
  installmentAvailable: false, media: [], viewCount: 19, favoriteCount: 4,
  publishedAt: "2026-09-20T00:00:00Z", createdAt: "2026-09-20T00:00:00Z", updatedAt: "2026-09-22T00:00:00Z",
  description: "One owner. Regular service. Ready for viewing.",
  conditionDisclosure: { damaged: false, knownIssuesText: "Small scratch" }, ...updates,
});
beforeEach(() => {
  state.data = fixture(); state.error = null; state.isPending = false; state.viewer = null;
  state.authenticated = true; state.post.mockReset(); state.refetch.mockClear();
  routeParams.id = state.data.id;
});

describe("issue 373 approved detail content", () => {
  it("renders title, price, date/city, specs, description, condition, seller, report and footer in order", () => {
    const screen = renderMobile(<ListingDetailView listing={fixture({ mileageKm: 12000, transmissionId: "transmission", engineTypeId: "engine", enginePower: 180, driveTypeId: "drive", condition: "used", bodyTypeId: "body", colorId: "color", vin: "VIN373" })} maps={maps} onReport={vi.fn()} />);
    const text = screen.UNSAFE_getAllByType(Text).map((node) => node.props.children).flat(Infinity).filter((value) => typeof value === "string");
    const expected = ["Toyota Camry XV70, 2020", "35,000 TMT", "20 Sep · Ashgabat", "Specifications", "Year", "Mileage", "Transmission", "Fuel type", "Engine power", "Drive type", "Condition", "Body type", "Color", "VIN", "Description", fixture().description, "Condition, as stated by the seller", "Seller", "Merdan", "Report", "ID 373", "Published", "Updated"];
    let last = -1;
    for (const value of expected) {
      const next = text.indexOf(value);
      expect(next, `${value} follows ${expected[expected.indexOf(value) - 1]}`).toBeGreaterThan(last);
      last = next;
    }
  });

  it("clamps the seller description and expands after More", () => {
    const screen = renderMobile(<ListingDetailView listing={fixture()} maps={maps} />);
    expect(screen.getByText(fixture().description ?? "").props.numberOfLines).toBe(3);
    fireEvent.press(screen.getByRole("button", { name: "More" }));
    expect(screen.getByText(fixture().description ?? "").props.numberOfLines).toBeUndefined();
  });

  it("uses the real seller name and join month, with Private seller fallback and no phone badge", () => {
    const screen = renderMobile(<ListingDetailView listing={fixture()} maps={maps} />);
    expect(screen.getByText("Merdan")).toBeTruthy();
    expect(screen.getByText(/On AutoTM since.*January 2024/)).toBeTruthy();
    expect(screen.queryByText("Phone verified")).toBeNull();
    screen.rerender(<ListingDetailView listing={fixture({ seller: { displayName: null, memberSince: "2024-01-01T00:00:00Z" } })} maps={maps} />);
    expect(screen.getByText("Private seller")).toBeTruthy();
  });

  it("omits missing specs, description and disclosure without placeholders", () => {
    const screen = renderMobile(<ListingDetailView listing={fixture({ year: undefined, description: undefined, conditionDisclosure: undefined })} maps={maps} />);
    for (const label of ["Year", "Mileage", "Engine power", "VIN", "Description", "Condition, as stated by the seller", "Not provided", "Not decoded"]) expect(screen.queryByText(label)).toBeNull();
  });

  it.each([undefined, { decoded: false }])("hides unavailable VIN decoding and removes inspection/trust entries", (vinHistory) => {
    const screen = renderMobile(<ListingDetailView listing={fixture({ vin: "VIN373", vinHistory })} maps={maps} />);
    expect(screen.getByText("VIN373")).toBeTruthy();
    for (const label of [/VIN history/i, /not decoded/i, /How to buy safely/i, /Request AutoTM inspection/i]) expect(screen.queryByText(label)).toBeNull();
  });

  it("keeps the decoded VIN case usable", () => {
    const screen = renderMobile(<ListingDetailView listing={fixture({ vin: "VIN373", vinHistory: { decoded: true, brand: "Decoded Toyota", model: "Decoded Camry", year: 2020, confidence: 0.92 } })} maps={maps} />);
    expect(screen.getByText("VIN history")).toBeTruthy();
    expect(screen.getByText("Decoded Toyota")).toBeTruthy();
    expect(screen.getByText(/92%/)).toBeTruthy();
  });

  it("shows views and saves only to the owner and moves lifecycle actions out of detail content", () => {
    const screen = renderMobile(<ListingDetailView listing={fixture()} maps={maps} />);
    expect(screen.queryByText(/19 views/)).toBeNull();
    screen.rerender(<ListingDetailView listing={fixture()} maps={maps} isOwner />);
    expect(screen.getByText("19 views")).toBeTruthy();
    expect(screen.getByText("4 saves")).toBeTruthy();
    expect(screen.getByText("10,000 USD")).toBeTruthy();
    for (const name of ["Edit", "Mark as sold", "Archive listing", "Delete"]) expect(screen.queryByRole("button", { name })).toBeNull();
  });
});

describe("issue 373 screen controls", () => {
  it("keeps Back, Share, Favorite and More options visible, then reveals the price/title after the photos scroll away", () => {
    const screen = renderMobile(<ListingDetailScreen />);
    for (const name of ["Back", "Share", "Favorite", "More options"]) expect(screen.getByRole("button", { name })).toBeTruthy();
    expect(screen.queryByText("Toyota Camry, 2020")).toBeNull();
    fireEvent.scroll(screen.UNSAFE_getByType(ScrollView), { nativeEvent: { contentOffset: { y: 500, x: 0 } } });
    expect(screen.getByText("Toyota Camry, 2020")).toBeTruthy();
    expect(screen.getAllByText("35,000 TMT")).toHaveLength(2);
  });

  it("shares from the header and offers Report and Copy link in overflow", async () => {
    const share = vi.spyOn(Share, "share");
    const screen = renderMobile(<ListingDetailScreen />);
    await act(async () => { fireEvent.press(screen.getByRole("button", { name: "Share" })); });
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: `https://auto.tm/listings/${fixture().id}` }));
    fireEvent.press(screen.getByRole("button", { name: "More options" }));
    expect(screen.getByRole("button", { name: "Copy link" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Report" }).length).toBeGreaterThan(0);
  });

  it("shows sticky owner Edit and Mark sold, with Archive and Delete in overflow", () => {
    state.viewer = { userId: fixture().sellerId };
    const screen = renderMobile(<ListingDetailScreen />);
    expect(screen.queryByRole("button", { name: "Call" })).toBeNull();
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark as sold" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Archive listing" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "More options" }));
    expect(screen.getByRole("button", { name: "Archive listing" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Report" })).toBeNull();
  });

  it.each(["sold", "archived"] as const)("hides contact, Favorite and Report for a %s buyer", (status) => {
    state.data = fixture({ status });
    const screen = renderMobile(<ListingDetailScreen />);
    for (const name of ["Call", "Message", "Favorite", "Report"]) expect(screen.queryByRole("button", { name })).toBeNull();
    expect(screen.getByText(status === "sold" ? "Sold" : "Removed from sale")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "See other Toyota Camry" }));
    expect(routerMock.navigate).toHaveBeenCalledWith(expect.objectContaining({ params: { brandId: "brand", modelId: "model" } }));
  });

  it("gives 404 Home and Back recovery", () => {
    state.error = { status: 404 };
    const screen = renderMobile(<ListingDetailScreen />);
    expect(screen.getByText("This listing is no longer available")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Go to Home" }));
    expect(routerMock.navigate).toHaveBeenCalledWith("/(tabs)/(search)");
    fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(routerMock.back).toHaveBeenCalled();
  });

  it("keeps only Call and Message in the contact bar and the SMS verification caption by Call", async () => {
    state.authenticated = false;
    const screen = renderMobile(<ContactCtaBar listingId={fixture().id} status="active" allowCalls allowChat contactPhone="+99361000000" />);
    expect(screen.getAllByRole("button").map((button) => button.props.accessibilityLabel ?? button.props.children)).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Favorite" })).toBeNull();
    expect(screen.getByText("AutoTM verifies sellers' numbers by SMS.")).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByRole("button", { name: "Call" })); });
    expect(Linking.openURL).toHaveBeenCalledWith("tel:+99361000000");
    fireEvent.press(screen.getByRole("button", { name: "Message" }));
    expect(routerMock.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: "/(auth)/phone" }));
  });

  it.each(["Favorite", "Report"])("parks anonymous %s through requireSignIn", (action) => {
    state.authenticated = false;
    const screen = renderMobile(<ListingDetailScreen />);
    fireEvent.press(screen.getByRole("button", { name: action }));
    expect(routerMock.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: "/(auth)/phone" }));
  });
});
