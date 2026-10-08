import type * as NextNavigation from "next/navigation";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

const mockState = vi.hoisted(() => ({
  requestHeaders: new Headers(),
  cookieStore: {
    get: vi.fn(),
    set: vi.fn(),
  },
  redirect: vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`);
    (error as Error & { digest: string }).digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw error;
  }),
}));

vi.mock("next/headers", () => ({
  headers: async () => mockState.requestHeaders,
  cookies: vi.fn(() => Promise.resolve(mockState.cookieStore)),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...await importOriginal<typeof NextNavigation>(),
  redirect: mockState.redirect,
}));

import { listAllBrands, removeBrandLogo, uploadBrandLogo } from "./actions";

type FetchCall = [string, RequestInit];

function mockFetchSequence(responses: Array<{ status: number; body: unknown }>) {
  const fetchMock = vi.fn();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(response.body), { status: response.status }),
    );
  }
  global.fetch = fetchMock as Mock;
  return fetchMock;
}

function logoForm(bytes: number, type: string): FormData {
  const form = new FormData();
  form.set("logo", new File([new Uint8Array(bytes).fill(7)], "logo", { type }));
  return form;
}

describe("brand logo server actions", () => {
  it("cancels a rejected upload before file validation or API work", async () => {
    mockState.requestHeaders.set("x-admin-session-expired", "1");
    mockFetchSequence([]);
    await expect(uploadBrandLogo("b1", new FormData())).rejects.toThrow("NEXT_REDIRECT:/login?reason=session-expired");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("propagates a session-expired redirect without treating it as an upload error", async () => {
    mockFetchSequence([{ status: 401, body: { code: "UNAUTHORIZED" } }]);
    await expect(removeBrandLogo("b1")).rejects.toThrow("NEXT_REDIRECT:/login?reason=session-expired");
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.requestHeaders = new Headers();
    mockState.cookieStore.get.mockReturnValue({ value: "acc_tok" });
  });

  describe("listAllBrands", () => {
    it("follows the cursor until the last page", async () => {
      const fetchMock = mockFetchSequence([
        {
          status: 200,
          body: {
            items: [{ id: "b1", name: "Audi", slug: "audi", logoUrl: "https://m/a.png" }],
            nextCursor: "c1",
            hasMore: true,
          },
        },
        {
          status: 200,
          body: { items: [{ id: "b2", name: "BMW", slug: "bmw" }], nextCursor: null, hasMore: false },
        },
      ]);

      const result = await listAllBrands();

      expect(result).toEqual({
        ok: true,
        data: [
          { id: "b1", name: "Audi", slug: "audi", logoUrl: "https://m/a.png" },
          { id: "b2", name: "BMW", slug: "bmw" },
        ],
      });
      const urls = (fetchMock.mock.calls as FetchCall[]).map(([url]) => url);
      expect(urls[0]).toContain("/catalog/brands?locale=ru&limit=500");
      expect(urls[1]).toContain("cursor=c1");
    });
  });

  describe("uploadBrandLogo", () => {
    it("presigns, PUTs the file to storage, then confirms the key", async () => {
      const fetchMock = mockFetchSequence([
        {
          status: 201,
          body: {
            uploadUrl: "https://media.example/catalog-assets/pending/brands/audi/u1?sig",
            key: "pending/brands/audi/u1",
            expiresIn: 600,
            headers: { "Content-Type": "image/png", "Content-Disposition": "attachment" },
          },
        },
        { status: 200, body: {} },
        { status: 200, body: { id: "b1", logoUrl: "https://m/catalog-assets/x.png" } },
      ]);

      const result = await uploadBrandLogo("b1", logoForm(3, "image/png"));

      expect(result).toEqual({
        ok: true,
        data: { id: "b1", logoUrl: "https://m/catalog-assets/x.png" },
      });
      const [presignCall, putCall, confirmCall] = fetchMock.mock.calls as [
        FetchCall,
        FetchCall,
        FetchCall,
      ];
      expect(presignCall[0]).toMatch(/\/admin\/catalog\/brands\/b1\/logo\/presign$/);
      expect(new Headers(presignCall[1].headers).get("Authorization")).toBe("Bearer acc_tok");
      expect(JSON.parse(presignCall[1].body as string)).toEqual({
        contentType: "image/png",
        sizeBytes: 3,
      });

      expect(putCall[0]).toBe("https://media.example/catalog-assets/pending/brands/audi/u1?sig");
      expect(putCall[1].method).toBe("PUT");
      expect(putCall[1].headers).toEqual({
        "Content-Type": "image/png",
        "Content-Disposition": "attachment",
      });
      expect([...(putCall[1].body as Uint8Array)]).toEqual([7, 7, 7]);

      expect(confirmCall[0]).toMatch(/\/admin\/catalog\/brands\/b1\/logo$/);
      expect(confirmCall[1].method).toBe("PUT");
      expect(JSON.parse(confirmCall[1].body as string)).toEqual({ key: "pending/brands/audi/u1" });
    });

    it("reports a failed storage PUT without confirming", async () => {
      const fetchMock = mockFetchSequence([
        {
          status: 201,
          body: { uploadUrl: "https://m/u?sig", key: "pending/brands/audi/u1", expiresIn: 600, headers: {} },
        },
        { status: 403, body: {} },
      ]);

      expect(await uploadBrandLogo("b1", logoForm(3, "image/png"))).toEqual({
        ok: false,
        error: "Не удалось загрузить файл в хранилище. Попробуйте ещё раз.",
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("rejects a missing, unsupported, or oversized file without calling the API", async () => {
      const fetchMock = mockFetchSequence([]);

      expect(await uploadBrandLogo("b1", new FormData())).toEqual({
        ok: false,
        error: "Выберите файл логотипа.",
      });
      expect(await uploadBrandLogo("b1", logoForm(10, "image/jpeg"))).toEqual({
        ok: false,
        error: "Загрузите файл SVG, PNG или WebP.",
      });
      expect(await uploadBrandLogo("b1", logoForm(200 * 1024 + 1, "image/png"))).toEqual({
        ok: false,
        error: "Файл больше 200 КБ.",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("maps an API rejection reason to a clear message", async () => {
      mockFetchSequence([
        {
          status: 400,
          body: {
            code: "VALIDATION_FAILED",
            message: "Logo must be roughly square",
            details: { reason: "LOGO_NOT_SQUARE" },
          },
        },
      ]);

      expect(await uploadBrandLogo("b1", logoForm(10, "image/webp"))).toEqual({
        ok: false,
        error: "Логотип должен быть почти квадратным (стороны не больше 1:1,25).",
      });
    });

    it("reports a 403 from the API", async () => {
      mockFetchSequence([{ status: 403, body: { code: "FORBIDDEN", message: "Forbidden" } }]);

      expect(await uploadBrandLogo("b1", logoForm(10, "image/png"))).toEqual({
        ok: false,
        error: "Недостаточно прав.",
      });
    });
  });

  describe("removeBrandLogo", () => {
    it("calls DELETE on the logo endpoint", async () => {
      const fetchMock = mockFetchSequence([{ status: 200, body: { success: true } }]);

      expect(await removeBrandLogo("b1")).toEqual({ ok: true, data: { success: true } });
      const [url, init] = fetchMock.mock.calls[0] as FetchCall;
      expect(url).toMatch(/\/admin\/catalog\/brands\/b1\/logo$/);
      expect(init.method).toBe("DELETE");
    });
  });
});
