// @vitest-environment happy-dom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  removeUserPhoto: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("../actions", () => ({
  removeUserPhoto: mockState.removeUserPhoto,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockState.refresh }),
}));

import { RemovePhotoForm } from "./RemovePhotoForm";

function renderForm() {
  return render(createElement(RemovePhotoForm, { reportId: "r1", targetId: "u1" }));
}

describe("RemovePhotoForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows only the remove button until the moderator asks to confirm", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Удалить фото" })).toBeDefined();
    expect(screen.queryByLabelText("Причина действия")).toBeNull();
  });

  it("asks for confirmation with a reason before calling the route", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Удалить фото" }));

    expect(screen.getByLabelText("Причина действия")).toBeDefined();
    expect(screen.getByRole("button", { name: "Подтвердить удаление" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Отмена" })).toBeDefined();
    expect(mockState.removeUserPhoto).not.toHaveBeenCalled();
  });

  it("cancels back to the idle state", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Удалить фото" }));
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));

    expect(screen.getByRole("button", { name: "Удалить фото" })).toBeDefined();
    expect(screen.queryByLabelText("Причина действия")).toBeNull();
    expect(mockState.removeUserPhoto).not.toHaveBeenCalled();
  });

  it("refuses an empty reason", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Удалить фото" }));
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить удаление" }));

    expect(await screen.findByText("Укажите причину (1–1000 символов).")).toBeDefined();
    expect(mockState.removeUserPhoto).not.toHaveBeenCalled();
  });

  it("calls the removal route with the report id and confirms success", async () => {
    mockState.removeUserPhoto.mockResolvedValue({
      ok: true,
      data: {
        targetId: "u1",
        targetState: { avatarKey: null, avatarIndex: 3 },
        reportId: "r1",
        reportStatus: "actioned",
        auditLogId: "a1",
      },
    });
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Удалить фото" }));
    fireEvent.change(screen.getByLabelText("Причина действия"), {
      target: { value: "Неприемлемое фото" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить удаление" }));

    expect(await screen.findByText("Фото удалено.")).toBeDefined();
    expect(mockState.removeUserPhoto).toHaveBeenCalledWith("u1", "Неприемлемое фото", "r1");
    await waitFor(() => expect(mockState.refresh).toHaveBeenCalled());
  });

  it("shows the API error and leaves the report unchanged on failure", async () => {
    mockState.removeUserPhoto.mockResolvedValue({
      ok: false,
      error: "Target state conflict",
      code: "CONFLICT",
      details: { details: { reason: "MODERATION_TARGET_STATE_CONFLICT" } },
    });
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Удалить фото" }));
    fireEvent.change(screen.getByLabelText("Причина действия"), {
      target: { value: "Неприемлемое фото" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить удаление" }));

    expect(await screen.findByText("Состояние цели изменилось. Обновите страницу.")).toBeDefined();
    expect(screen.queryByText("Фото удалено.")).toBeNull();
    expect(mockState.refresh).not.toHaveBeenCalled();
  });

  it("shows a generic failure without reporting success", async () => {
    mockState.removeUserPhoto.mockResolvedValue({ ok: false, error: "Ошибка сервера" });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Удалить фото" }));
    fireEvent.change(screen.getByLabelText("Причина действия"), { target: { value: "Причина" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить удаление" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Не удалось выполнить действие.");
    expect(screen.queryByText("Фото удалено.")).toBeNull();
  });

  it("tells the moderator the action is unavailable when the feature is disabled", async () => {
    mockState.removeUserPhoto.mockResolvedValue({
      ok: false,
      error: "Feature disabled",
      code: "FORBIDDEN",
      details: { details: { reason: "FEATURE_DISABLED" } },
    });
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Удалить фото" }));
    fireEvent.change(screen.getByLabelText("Причина действия"), {
      target: { value: "Неприемлемое фото" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить удаление" }));

    expect(await screen.findByText("Действие временно недоступно.")).toBeDefined();
  });
  it.each([
    ["CONFLICT", "REPORT_ALREADY_RESOLVED", "Жалоба уже обработана другим администратором. Обновите страницу."],
    ["CONFLICT", "MODERATION_TARGET_STATE_CONFLICT", "Состояние цели изменилось. Обновите страницу."],
    ["CONFLICT", "REPORT_TARGET_NOT_ACTIONABLE", "Цель больше не доступна для действия. Обновите страницу."],
    ["CONFLICT", "REPORT_TARGET_MISMATCH", "Не удалось выполнить действие."],
    ["NOT_FOUND", undefined, "Не удалось выполнить действие."],
    ["FORBIDDEN", "ADMIN_TARGET_NOT_MODERATABLE", "Фото администраторов нельзя удалять."],
    ["FORBIDDEN", "SELF_MODERATION_NOT_ALLOWED", "Нельзя применять действия к собственной учётной записи."],
    ["INTERNAL_ERROR", "FEATURE_DISABLED", "Не удалось выполнить действие."],
    ["FORBIDDEN", "REPORT_ALREADY_RESOLVED", "Не удалось выполнить действие."],
  ])("uses Russian error text for %s/%s and keeps it on screen", async (code, reason, message) => {
    mockState.removeUserPhoto.mockResolvedValue({ ok: false, code, error: "English API error", details: { details: { reason } } });
    const view = renderForm();
    // A refresh after a stale report error would unmount the form and lose its alert.
    mockState.refresh.mockImplementationOnce(() => view.rerender(createElement("p", null, "Обработана")));
    fireEvent.click(screen.getByRole("button", { name: "Удалить фото" }));
    fireEvent.change(screen.getByLabelText("Причина действия"), { target: { value: "Причина" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить удаление" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", message);
    expect(screen.queryByText("English API error")).toBeNull();
    expect(mockState.refresh).not.toHaveBeenCalled();
  });

});
