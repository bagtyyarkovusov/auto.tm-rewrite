// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  listAuditEntries: vi.fn(),
}));

vi.mock("../actions", () => ({
  listAuditEntries: mockState.listAuditEntries,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

import AuditPage from "./page";

describe("AuditPage action labels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.listAuditEntries.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            createdAt: "2026-01-01T00:00:00Z",
            action: "USER_PHOTO_REMOVE",
            actorSummary: { id: "22222222-2222-2222-2222-222222222222", label: "Admin One" },
            targetType: "user",
            targetId: "33333333-3333-3333-3333-333333333333",
            reasonPreview: "Неприемлемое фото",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("labels USER_PHOTO_REMOVE in Russian in the table and the filter", async () => {
    const jsx = await AuditPage({ searchParams: Promise.resolve({}) });
    render(jsx);

    const labels = screen.getAllByText("Удаление фото профиля");
    expect(labels.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("USER_PHOTO_REMOVE")).toBeNull();
  });
});
