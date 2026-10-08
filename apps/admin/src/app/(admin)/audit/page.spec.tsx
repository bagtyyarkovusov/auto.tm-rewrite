// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ listAuditEntries: vi.fn() }));
vi.mock("../actions", () => ({ listAuditEntries: state.listAuditEntries }));
import AuditPage from "./page";
afterEach(cleanup);
it("labels the reported Message read audit in Russian", async () => {
  state.listAuditEntries.mockResolvedValue({ ok: true, data: { items: [{ id: "a1", createdAt: "2026-01-01T12:00:00Z", action: "REPORTED_MESSAGE_READ", actorSummary: { available: true, label: "Администратор" }, targetType: "message", targetId: "m1" }], total: 1, totalPages: 1, page: 1 } });
  render(await AuditPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getAllByText("Просмотр сообщения по жалобе").length).toBeGreaterThan(0);
  expect(screen.queryByText("REPORTED_MESSAGE_READ")).toBeNull();
});
