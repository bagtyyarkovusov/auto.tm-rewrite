// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ listReports: vi.fn() }));
vi.mock("../actions", () => ({ listReports: state.listReports }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("Unexpected redirect"); } }));
import ReportsPage from "./page";
afterEach(cleanup);
describe("Message reports queue", () => {
  it("labels Message rows in Russian and offers a Message type filter", async () => {
    state.listReports.mockResolvedValue({ ok: true, data: { items: [{ id: "r1", status: "pending", reason: "spam", createdAt: "2026-01-01T12:00:00Z", targetType: "message", targetId: "m1", targetSummary: { available: true, label: "Цель из сообщения" } }], total: 1, totalPages: 1, page: 1 } });
    render(await ReportsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("option", { name: "Сообщение" }).getAttribute("value")).toBe("message");
    expect(screen.getAllByText("Сообщение")).toHaveLength(2);
  });
  it("accepts the Message filter and forwards it to the reports read", async () => {
    state.listReports.mockResolvedValue({ ok: true, data: { items: [], total: 0, totalPages: 0, page: 1 } });
    render(await ReportsPage({ searchParams: Promise.resolve({ targetType: "message" }) }));
    expect(state.listReports).toHaveBeenLastCalledWith({ status: "pending", targetType: "message", page: 1, pageSize: 50 });
    expect((screen.getByLabelText("Тип") as HTMLSelectElement).value).toBe("message");
  });
});
