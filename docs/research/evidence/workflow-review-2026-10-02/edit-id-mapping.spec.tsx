// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSaveListingEdit } from "../../../../apps/mobile/src/listings/edit/useSaveListingEdit";
const calls = vi.hoisted(() => ({ attach: vi.fn(async () => ({ id: "550e8400-e29b-41d4-a716-446655440002" })), reorder: vi.fn(async () => undefined), edit: vi.fn(), remove: vi.fn() }));
vi.mock("../../../../apps/mobile/src/api/listings/useAttachMedia", () => ({ useAttachMedia: () => ({ mutateAsync: calls.attach }) }));
vi.mock("../../../../apps/mobile/src/api/listings/useReorderMedia", () => ({ useReorderMedia: () => ({ mutateAsync: calls.reorder }) }));
vi.mock("../../../../apps/mobile/src/api/listings/useEditListing", () => ({ useEditListing: () => ({ mutateAsync: calls.edit }) }));
vi.mock("../../../../apps/mobile/src/api/listings/useRemoveMedia", () => ({ useRemoveMedia: () => ({ mutateAsync: calls.remove }) }));
describe("edit new media ID boundary", () => {
 it("uses the API's attached media ID for reorder", async () => {
  const photos = [{ photoId: "550e8400-e29b-41d4-a716-446655440001", key: "pending/test/original.jpg", state: "uploaded" as const, sortOrder: 0, retryCount: 0 }];
  const { result } = renderHook(() => useSaveListingEdit("550e8400-e29b-41d4-a716-446655440003", {}, photos, []));
  await act(async () => { await result.current.save(); });
  expect(calls.attach).toHaveBeenCalledOnce();
  expect(calls.reorder).toHaveBeenCalledWith({ ordering: [{ mediaId: "550e8400-e29b-41d4-a716-446655440002", sortOrder: 0 }] });
 });
});
