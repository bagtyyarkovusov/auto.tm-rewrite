import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderMobile, routeParams } from "../render";
import ManageListingsScreen from "../../app/listings/manage";

import { ToastProvider } from "@/components/ui/toast";

const fx = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("../../src/api/client", () => ({
  apiClient: { get: fx.get, post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error { constructor(public code: string, public status: number) { super(code); } },
}));
vi.mock("react-native-safe-area-context", async () => ({
  SafeAreaView: (await import("react-native")).View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("../../components/auth/SignInDialog", () => ({ SignInDialog: () => null }));
vi.mock("@/components/ui/progress", async () => ({ Progress: (await import("react-native")).View }));
vi.mock("../../src/auth/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("../../src/auth/useViewer", () => ({ useViewer: () => ({ userId: "me" }) }));
vi.mock("../../src/api/catalog/useBrands", () => ({ useBrands: () => ({ data: { items: [] } }) }));
vi.mock("../../src/listings/feed/useFeedCatalogMaps", () => ({ useFeedCatalogMaps: () => ({
  brandName: () => undefined, brandLogoUrl: () => undefined, cityName: () => undefined, modelName: () => undefined,
}) }));

async function settle() {
  for (let i = 0; i < 5; i += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

beforeEach(() => {
  fx.get.mockReset().mockResolvedValue({ items: [], nextCursor: null });
});

describe("My listings starting tab", () => {
  it("opens on Drafts when the route asks for it", async () => {
    routeParams.tab = "drafts";
    const screen = renderMobile(<ToastProvider><ManageListingsScreen /></ToastProvider>);
    await settle();

    expect(screen.getByRole("tab", { name: "Drafts", selected: true })).toBeTruthy();
    expect(screen.getByText("No drafts")).toBeTruthy();
  });

  it("opens on its default tab without a parameter", async () => {
    const screen = renderMobile(<ToastProvider><ManageListingsScreen /></ToastProvider>);
    await settle();

    expect(screen.getByRole("tab", { name: "Active", selected: true })).toBeTruthy();
  });

  it("ignores an unknown tab", async () => {
    routeParams.tab = "nope";
    const screen = renderMobile(<ToastProvider><ManageListingsScreen /></ToastProvider>);
    await settle();

    expect(screen.getByRole("tab", { name: "Active", selected: true })).toBeTruthy();
  });
});
