// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      avatarIndex: 3,
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
  it("hides removal if config cannot confirm permission", async () => {
    mockDetail(userReport());
    mockState.getConfig.mockResolvedValue({ ok: false, code: "FORBIDDEN", error: "Нет доступа" });
    await renderPage();
    expect(screen.queryByRole("button", { name: "Удалить фото" })).toBeNull();
  });

  it("renders no action when the staff read is forbidden", async () => {
    mockDetail(userReport());
    mockState.getReportDetail.mockResolvedValue({ ok: false, code: "FORBIDDEN", error: "Нет доступа" });
    await renderPage();
    expect(screen.getByText("Нет доступа")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Удалить фото" })).toBeNull();
  });

  it("shows the Assigned Avatar and actioned report after successful removal and refresh", async () => {
    mockDetail(userReport());
    mockState.removeUserPhoto.mockResolvedValue({ ok: true, data: {
      targetId: "u1", targetState: { avatarKey: null, avatarIndex: 3 }, reportStatus: "actioned", reportId: "r1", auditLogId: "a1",
    } });
    const view = await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Удалить фото" }));
    fireEvent.change(screen.getByLabelText("Причина действия"), { target: { value: "Неприемлемое фото" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить удаление" }));
    await waitFor(() => expect(mockState.refresh).toHaveBeenCalled());
    mockDetail(userReport({ status: "actioned", target: { ...userReport().target, avatarKey: null } }));
    view.rerender(await ReportDetailPage({ params: Promise.resolve({ id: "r1" }) }));
    expect(screen.getByText("Обработана")).toBeDefined();
    expect(screen.getByRole("img", { name: "Назначенный аватар" }).getAttribute("src")).toBe("/assigned-avatars/3.svg");
    expect(screen.queryByRole("img", { name: "Фото профиля" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Удалить фото" })).toBeNull();
  });

  it("keeps photo and pending report on a failed removal", async () => {
    mockDetail(userReport());
    mockState.removeUserPhoto.mockResolvedValue({ ok: false, code: "INTERNAL_ERROR", error: "Ошибка сервера" });
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Удалить фото" }));
    fireEvent.change(screen.getByLabelText("Причина действия"), { target: { value: "Неприемлемое фото" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить удаление" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Ошибка сервера");
    expect(screen.getByText("В ожидании")).toBeDefined();
    expect(screen.getByRole("img", { name: "Фото профиля" })).toBeDefined();
    expect(screen.queryByText("Фото удалено.")).toBeNull();
  });

  it.each([
    { role: "admin" },
    { available: false },
  ])("hides removal for ineligible targets %j", async (overrides) => {
    mockDetail(userReport({ target: { ...userReport().target, ...overrides } }));
    await renderPage();
    expect(screen.queryByRole("button", { name: "Удалить фото" })).toBeNull();
  });

});
