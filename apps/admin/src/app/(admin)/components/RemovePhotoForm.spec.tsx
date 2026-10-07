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

    expect(await screen.findByText("Состояние цели изменилось. Страница обновлена.")).toBeDefined();
    expect(screen.queryByText("Фото удалено.")).toBeNull();
    await waitFor(() => expect(mockState.refresh).toHaveBeenCalled());
  });

  it("shows a generic failure without reporting success", async () => {
    mockState.removeUserPhoto.mockResolvedValue({ ok: false, error: "Ошибка сервера" });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Удалить фото" }));
    fireEvent.change(screen.getByLabelText("Причина действия"), { target: { value: "Причина" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить удаление" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Ошибка сервера");
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
});
