// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  getReportDetail: vi.fn(),
  getConfig: vi.fn(),
  dismissReport: vi.fn(),
  banListing: vi.fn(),
  suspendUser: vi.fn(),
  removeUserPhoto: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("../../actions", () => ({
  getReportDetail: mockState.getReportDetail,
  getConfig: mockState.getConfig,
  dismissReport: mockState.dismissReport,
  banListing: mockState.banListing,
  suspendUser: mockState.suspendUser,
  removeUserPhoto: mockState.removeUserPhoto,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({ refresh: mockState.refresh }),
}));

import ReportDetailPage from "./page";

const PHOTO_KEY = "pending/u1-photo/original.jpg";

function userReport(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    status: "pending",
    reason: "spam",
    createdAt: "2026-01-01T00:00:00Z",
    reporter: { available: true, label: "Alice" },
    target: {
      targetType: "user",
      available: true,
      label: "Bob",
      targetId: "u1",
      role: "buyer",
      avatarKey: PHOTO_KEY,
    },
    pendingReportsOnTargetCount: 0,
    ...overrides,
  };
}

function mockDetail(report: unknown, moderationEnabled = true) {
  mockState.getReportDetail.mockResolvedValue({ ok: true, data: report });
  mockState.getConfig.mockResolvedValue({
    ok: true,
    data: {
      reportEntryEnabled: true,
      adminModerationActionsEnabled: moderationEnabled,
      inspectionInterestEnabled: true,
    },
  });
}

async function renderPage(id = "r1") {
  const jsx = await ReportDetailPage({ params: Promise.resolve({ id }) });
  return render(jsx);
}

describe("ReportDetailPage profile photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the reported user's Profile Photo and the remove action when a photo is set", async () => {
    mockDetail(userReport());

    await renderPage();

    const photo = screen.getByRole("img", { name: "Фото профиля" });
    expect(photo.getAttribute("src")).toContain(PHOTO_KEY);
    expect(screen.getByText("Удалить фото профиля")).toBeDefined();
    expect(screen.getByRole("button", { name: "Удалить фото" })).toBeDefined();
  });

  it("shows nothing extra when the user has only the Assigned Avatar", async () => {
    mockDetail(userReport({ target: {
      targetType: "user",
      available: true,
      label: "Bob",
      targetId: "u1",
      role: "buyer",
      avatarKey: null,
    } }));

    await renderPage();

    expect(screen.queryByRole("img", { name: "Фото профиля" })).toBeNull();
    expect(screen.queryByText("Удалить фото профиля")).toBeNull();
    expect(screen.queryByRole("button", { name: "Удалить фото" })).toBeNull();
  });

  it("offers no remove action when moderation actions are disabled", async () => {
    mockDetail(userReport(), false);

    await renderPage();

    expect(screen.queryByRole("button", { name: "Удалить фото" })).toBeNull();
    expect(screen.getByText("Действия модерации временно недоступны.")).toBeDefined();
  });

  it("offers no remove action once the report is actioned", async () => {
    mockDetail(userReport({ status: "actioned", reviewedAt: "2026-01-02T00:00:00Z" }));

    await renderPage();

    expect(screen.queryByRole("button", { name: "Удалить фото" })).toBeNull();
  });

  it("shows no photo block for a listing report", async () => {
    mockDetail({
      id: "r1",
      status: "pending",
      reason: "spam",
      createdAt: "2026-01-01T00:00:00Z",
      reporter: { available: true, label: "Alice" },
      target: {
        targetType: "listing",
        available: true,
        label: "2020 Toyota Camry",
        targetId: "l1",
        status: "active",
      },
      pendingReportsOnTargetCount: 0,
    });

    await renderPage();

    expect(screen.queryByRole("img", { name: "Фото профиля" })).toBeNull();
    expect(screen.queryByText("Удалить фото профиля")).toBeNull();
  });
});
