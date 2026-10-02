// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { server } from "../../../test/msw";
import type { StagedPhoto } from "../uploadStaging/types";

import { useSaveListingEdit, EditSessionError } from "./useSaveListingEdit";

vi.mock("../../auth/session", () => ({
  loadAuthSession: vi.fn(() =>
    Promise.resolve({
      accessToken: "token-123",
      refreshToken: "refresh-123",
      user: {
        id: "u1",
        phone: "+99361000000",
        displayName: null,
        role: "buyer",
      },
      storedAt: new Date().toISOString(),
    }),
  ),
  storeAuthSession: vi.fn(() => Promise.resolve()),
  clearAuthSession: vi.fn(() => Promise.resolve()),
}));

const LISTING_ID = "550e8400-e29b-41d4-a716-446655440000";
const PERSISTED_A = "550e8400-e29b-41d4-a716-446655440001";
const PERSISTED_B = "550e8400-e29b-41d4-a716-446655440002";
const LOCAL_NEW_1 = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const LOCAL_NEW_2 = "3b241101-e2bb-4255-8caf-4136c566a962";

function persistedKey(id: string): string {
  return `listings/${LISTING_ID}/${id}/original.jpg`;
}
const KEY_A = persistedKey(PERSISTED_A);
const KEY_B = persistedKey(PERSISTED_B);

function persisted(id: string, sortOrder: number): ListingsSchemas.ListingMedia {
  return {
    id,
    kind: "image",
    key: persistedKey(id),
    variants: {
      thumbnail: "t.jpg",
      list: "l.jpg",
      detail: "d.jpg",
      fullscreen: "f.jpg",
    },
    sortOrder,
    width: 1920,
    height: 1080,
  };
}

function staged(photoId: string, key: string, sortOrder: number): StagedPhoto {
  return {
    photoId,
    key,
    state: "uploaded",
    sortOrder,
    retryCount: 0,
    width: 1600,
    height: 1200,
  };
}

/**
 * In-memory stand-in for the API's media endpoints that enforces the same
 * contract the real ones do: attach mints a fresh server UUID, and remove and
 * reorder only know server media IDs that belong to the Listing.
 */
function createMediaApi(initial: ListingsSchemas.ListingMedia[]) {
  const rows = new Map(initial.map((m) => [m.id, { ...m }]));
  const requests = {
    attach: [] as ListingsSchemas.AttachMediaRequest[],
    remove: [] as string[],
    reorder: [] as ListingsSchemas.ReorderMediaRequest[],
  };
  const failures = { attachKeys: new Set<string>(), reorder: 0 };

  server.use(
    http.post("*/listings/:id/media/attach", async ({ request }) => {
      const body = (await request.json()) as ListingsSchemas.AttachMediaRequest;
      requests.attach.push(body);
      if (failures.attachKeys.delete(body.key)) {
        return HttpResponse.json({ message: "storage unavailable" }, { status: 500 });
      }
      const id = crypto.randomUUID();
      rows.set(id, {
        ...persisted(id, body.sortOrder),
        key: body.key,
      });
      return HttpResponse.json({
        id,
        listingId: LISTING_ID,
        kind: body.kind,
        key: body.key,
        sortOrder: body.sortOrder,
        width: body.width,
        height: body.height,
        createdAt: "2026-10-02T12:00:00.000Z",
      });
    }),
    http.delete("*/listings/:id/media/:mediaId", ({ params }) => {
      const mediaId = String(params.mediaId);
      requests.remove.push(mediaId);
      if (!rows.delete(mediaId)) {
        return HttpResponse.json({ message: "Media not found" }, { status: 404 });
      }
      return HttpResponse.json({ success: true });
    }),
    http.put("*/listings/:id/media/order", async ({ request }) => {
      const body = (await request.json()) as ListingsSchemas.ReorderMediaRequest;
      requests.reorder.push(body);
      if (failures.reorder > 0) {
        failures.reorder -= 1;
        return HttpResponse.json({ message: "temporarily unavailable" }, { status: 503 });
      }
      if (body.ordering.some((o) => !rows.has(o.mediaId))) {
        return HttpResponse.json({ message: "Media not found" }, { status: 404 });
      }
      for (const o of body.ordering) {
        const row = rows.get(o.mediaId);
        if (row) row.sortOrder = o.sortOrder;
      }
      return HttpResponse.json({ success: true });
    }),
  );

  return {
    requests,
    failures,
    /** Server media in cover-first order. */
    media: () => [...rows.values()].sort((a, b) => a.sortOrder - b.sortOrder),
    byKey: (key: string): ListingsSchemas.ListingMedia => {
      const row = [...rows.values()].find((m) => m.key === key);
      if (!row) throw new Error(`No server media with key ${key}`);
      return row;
    },
    keys: () => [...rows.values()].sort((a, b) => a.sortOrder - b.sortOrder).map((m) => m.key),
  };
}

function wrapperWithClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

interface HookProps {
  photos: StagedPhoto[];
  seed: ListingsSchemas.ListingMedia[];
}

function renderSave(props: HookProps) {
  return renderHook(
    (p: HookProps) => useSaveListingEdit(LISTING_ID, {}, p.photos, p.seed),
    { wrapper: wrapperWithClient(), initialProps: props },
  );
}

function sentMediaIds(api: ReturnType<typeof createMediaApi>): string[] {
  return [
    ...api.requests.remove,
    ...api.requests.reorder.flatMap((r) => r.ordering.map((o) => o.mediaId)),
  ];
}

describe("useSaveListingEdit server media IDs", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("reorders a new attachment by the ID attach returned, not its local staging UUID", async () => {
    const seed = [persisted(PERSISTED_A, 0)];
    const api = createMediaApi(seed);
    const newKey = "pending/9f1c/original.jpg";
    const photos = [
      // The seller dragged the new photo ahead of the existing one: it is the cover.
      staged(LOCAL_NEW_1, newKey, 0),
      staged(PERSISTED_A, KEY_A, 1),
    ];

    const { result } = renderSave({ photos, seed });
    await result.current.save();
    await waitFor(() => expect(result.current.status).toBe("succeeded"));

    const attached = api.byKey(newKey);
    expect(attached.id).not.toBe(LOCAL_NEW_1);
    expect(api.requests.reorder).toHaveLength(1);
    expect(api.requests.reorder.at(0)?.ordering).toEqual([
      { mediaId: attached.id, sortOrder: 0 },
      { mediaId: PERSISTED_A, sortOrder: 1 },
    ]);
    expect(sentMediaIds(api)).not.toContain(LOCAL_NEW_1);
    expect(api.keys()).toEqual([newKey, KEY_A]);
  });

  it("applies add, remove and reorder together with the intended cover and order", async () => {
    const seed = [
      persisted(PERSISTED_A, 0),
      persisted(PERSISTED_B, 1),
    ];
    const api = createMediaApi(seed);
    const key1 = "pending/aaa/original.jpg";
    const key2 = "pending/bbb/original.jpg";
    // A removed; B and two new photos remain, with the second new photo as cover.
    const photos = [
      staged(LOCAL_NEW_2, key2, 0),
      staged(PERSISTED_B, KEY_B, 1),
      staged(LOCAL_NEW_1, key1, 2),
    ];

    const { result } = renderSave({ photos, seed });
    await result.current.save();
    await waitFor(() => expect(result.current.status).toBe("succeeded"));

    expect(api.requests.attach.map((a) => a.key)).toEqual([key2, key1]);
    expect(api.requests.remove).toEqual([PERSISTED_A]);
    expect(api.keys()).toEqual([key2, KEY_B, key1]);
    const localIds = [LOCAL_NEW_1, LOCAL_NEW_2];
    expect(sentMediaIds(api).filter((id) => localIds.includes(id))).toEqual([]);
  });

  it("surfaces a reorder failure by name and retries without re-attaching or reusing a local ID", async () => {
    const seed = [persisted(PERSISTED_A, 0)];
    const api = createMediaApi(seed);
    api.failures.reorder = 1;
    const newKey = "pending/9f1c/original.jpg";
    const photos = [
      staged(PERSISTED_A, KEY_A, 0),
      staged(LOCAL_NEW_1, newKey, 1),
    ];

    const { result } = renderSave({ photos, seed });
    await expect(result.current.save()).rejects.toBeInstanceOf(EditSessionError);
    await waitFor(() => expect(result.current.status).toBe("failed"));

    expect(result.current.error?.failedOpId).toBe("reorder");
    expect(result.current.opStates[`attach:${LOCAL_NEW_1}`]).toBe("succeeded");
    expect(result.current.opStates["reorder"]).toBe("failed");

    await result.current.retry();
    await waitFor(() => expect(result.current.status).toBe("succeeded"));

    expect(api.requests.attach).toHaveLength(1);
    expect(api.media()).toHaveLength(2);
    const attached = api.byKey(newKey);
    for (const request of api.requests.reorder) {
      expect(request.ordering.map((o) => o.mediaId)).not.toContain(LOCAL_NEW_1);
      expect(request.ordering.map((o) => o.mediaId)).toEqual([PERSISTED_A, attached.id]);
    }
    expect(api.keys()).toEqual([KEY_A, newKey]);
  });

  it("keeps earlier attachments when a later attach fails and does not duplicate them on retry", async () => {
    const seed = [persisted(PERSISTED_A, 0)];
    const api = createMediaApi(seed);
    const key1 = "pending/aaa/original.jpg";
    const key2 = "pending/bbb/original.jpg";
    api.failures.attachKeys.add(key2);
    const photos = [
      staged(PERSISTED_A, KEY_A, 0),
      staged(LOCAL_NEW_1, key1, 1),
      staged(LOCAL_NEW_2, key2, 2),
    ];

    const { result } = renderSave({ photos, seed });
    await expect(result.current.save()).rejects.toBeInstanceOf(EditSessionError);
    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.error?.failedOpId).toBe(`attach:${LOCAL_NEW_2}`);

    await result.current.retry();
    await waitFor(() => expect(result.current.status).toBe("succeeded"));

    expect(api.requests.attach.map((a) => a.key)).toEqual([key1, key2, key2]);
    expect(api.media()).toHaveLength(3);
    expect(api.keys()).toEqual([KEY_A, key1, key2]);
    expect(sentMediaIds(api)).not.toContain(LOCAL_NEW_1);
    expect(sentMediaIds(api)).not.toContain(LOCAL_NEW_2);
  });

  it("does not remove just-attached media when the Listing refetches between failure and retry", async () => {
    const seed = [persisted(PERSISTED_A, 0)];
    const api = createMediaApi(seed);
    api.failures.reorder = 1;
    const newKey = "pending/9f1c/original.jpg";
    const photos = [
      staged(PERSISTED_A, KEY_A, 0),
      staged(LOCAL_NEW_1, newKey, 1),
    ];

    const { result, rerender } = renderSave({ photos, seed });
    await expect(result.current.save()).rejects.toBeInstanceOf(EditSessionError);
    await waitFor(() => expect(result.current.status).toBe("failed"));

    // Attach invalidated the Listing query; the refetched media now include the
    // server-minted row while the staged photo still carries its local UUID.
    rerender({ photos, seed: api.media() });

    await result.current.retry();
    await waitFor(() => expect(result.current.status).toBe("succeeded"));

    expect(api.requests.remove).toEqual([]);
    expect(api.requests.attach).toHaveLength(1);
    expect(api.keys()).toEqual([KEY_A, newKey]);
  });

  it("a fresh save after a partial failure reuses earlier attachments instead of duplicating them", async () => {
    const seed = [persisted(PERSISTED_A, 0)];
    const api = createMediaApi(seed);
    api.failures.reorder = 1;
    const newKey = "pending/9f1c/original.jpg";
    const photos = [
      staged(PERSISTED_A, KEY_A, 0),
      staged(LOCAL_NEW_1, newKey, 1),
    ];

    const { result, rerender } = renderSave({ photos, seed });
    await expect(result.current.save()).rejects.toBeInstanceOf(EditSessionError);
    await waitFor(() => expect(result.current.status).toBe("failed"));

    rerender({ photos, seed: api.media() });
    await result.current.save();
    await waitFor(() => expect(result.current.status).toBe("succeeded"));

    expect(api.requests.attach).toHaveLength(1);
    expect(api.requests.remove).toEqual([]);
    expect(api.media()).toHaveLength(2);
    expect(api.keys()).toEqual([KEY_A, newKey]);
  });

  it("removes an already-attached photo by its server ID when the seller drops it before saving again", async () => {
    const seed = [persisted(PERSISTED_A, 0)];
    const api = createMediaApi(seed);
    api.failures.reorder = 1;
    const newKey = "pending/9f1c/original.jpg";
    const photos = [
      staged(PERSISTED_A, KEY_A, 0),
      staged(LOCAL_NEW_1, newKey, 1),
    ];

    const { result, rerender } = renderSave({ photos, seed });
    await expect(result.current.save()).rejects.toBeInstanceOf(EditSessionError);
    const attached = api.byKey(newKey);

    rerender({ photos: photos.slice(0, 1), seed: api.media() });
    await result.current.save();
    await waitFor(() => expect(result.current.status).toBe("succeeded"));

    expect(api.requests.remove).toEqual([attached.id]);
    expect(api.keys()).toEqual([KEY_A]);
  });

  it("does not reintroduce a never-attached local UUID into reorder", async () => {
    const seed = [persisted(PERSISTED_A, 0)];
    const api = createMediaApi(seed);
    const photos = [
      staged(PERSISTED_A, KEY_A, 0),
      // Still has no object key: nothing to attach, and no server ID to order.
      { photoId: LOCAL_NEW_1, state: "uploading", sortOrder: 1, retryCount: 0 } as StagedPhoto,
    ];

    const { result } = renderSave({ photos, seed });
    await result.current.save();
    await waitFor(() => expect(result.current.status).toBe("succeeded"));

    expect(api.requests.attach).toEqual([]);
    expect(api.requests.reorder.at(0)?.ordering).toEqual([
      { mediaId: PERSISTED_A, sortOrder: 0 },
    ]);
  });
});
