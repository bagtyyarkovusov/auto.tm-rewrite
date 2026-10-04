import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "../../../test/msw";
import { fireEvent, renderMobile } from "../../../test/render";

import Step8Review from "./Step8Review";

vi.mock("lucide-react-native", async () => {
  const Icon = (await import("react-native")).View;
  return { Check: Icon, AlertCircle: Icon, Eye: Icon, ListChecks: Icon };
});
vi.mock("expo-image", async () => ({ Image: (await import("react-native")).View }));
vi.mock("../../api/catalog/useBrands", () => ({ useBrands: () => ({ data: { items: [] } }) }));
vi.mock("../../api/catalog/useModels", () => ({ useModels: () => ({ data: { items: [] } }) }));
vi.mock("../../api/catalog/useColors", () => ({ useColors: () => ({ data: { items: [] } }) }));
vi.mock("../../api/catalog/useBodyTypes", () => ({ useBodyTypes: () => ({ data: { items: [] } }) }));
vi.mock("../../api/catalog/useTransmissions", () => ({ useTransmissions: () => ({ data: { items: [] } }) }));
vi.mock("../../api/catalog/useDriveTypes", () => ({ useDriveTypes: () => ({ data: { items: [] } }) }));
vi.mock("../../api/catalog/useEngineTypes", () => ({ useEngineTypes: () => ({ data: { items: [] } }) }));

const MARY_REGION = "22222222-2222-4222-8222-222222222222";
const cityId = (index: number) => `cccccccc-cccc-4ccc-8ccc-${String(index).padStart(12, "0")}`;
// More cities than the API's default page of 20.
const CITIES = Array.from({ length: 25 }, (_, index) => ({
  id: cityId(index + 1),
  name: `Town ${index + 1}`,
  slug: `town-${index + 1}`,
  regionId: MARY_REGION,
}));
const DEFAULT_PAGE_SIZE = 20;

beforeEach(() => {
  server.resetHandlers();
  server.use(
    http.get("*/catalog/regions", () =>
      HttpResponse.json({ items: [{ id: MARY_REGION, name: "Mary region", slug: "mary" }] }),
    ),
    http.get("*/catalog/regions/:id/cities", ({ request }) => {
      const limit = Number(new URL(request.url).searchParams.get("limit") ?? DEFAULT_PAGE_SIZE);
      const items = CITIES.slice(0, limit);
      return HttpResponse.json({
        items,
        nextCursor: items.length < CITIES.length ? "next" : null,
        hasMore: items.length < CITIES.length,
      });
    }),
  );
});

describe("Check and publish place", () => {
  it("names a city that sits past the first page of its region", async () => {
    const screen = renderMobile(
      <Step8Review
        payload={{ regionId: MARY_REGION, cityId: cityId(25), allowCalls: true, allowChat: true }}
        validatedSteps={[]}
        onGoToStep={() => {}}
        photos={[]}
      />,
    );

    expect(await screen.findByText("Mary region, Town 25")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByText("Mary region, Town 25")).toBeTruthy();
    expect(screen.queryByText("Location not set")).toBeNull();
  });
});
