import { describe, it, expect, beforeEach } from "vitest";
import { BadRequestException } from "@nestjs/common";

import type { ContentReportRepository } from "../domain/ports/ContentReportRepository";
import type { ListingsReadPort } from "../../listings/domain/ports/ListingsReadPort";
import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { ContentReport } from "../domain/ContentReport";

import { ListReports } from "./ListReports";

class FakeContentReportRepository implements ContentReportRepository {
  reports: ContentReport[] = [];

  async save(report: ContentReport): Promise<ContentReport> {
    this.reports.push(report);
    return report;
  }

  async findById(_id: string): Promise<ContentReport | null> {
    return null;
  }

  async findPendingByReporterAndTarget(): Promise<ContentReport | null> {
    return null;
  }

  async findMany(params: {
    status?: string | undefined;
    targetType?: string | undefined;
    page: number;
    pageSize: number;
  }): Promise<{ items: ContentReport[]; total: number }> {
    let filtered = this.reports;
    if (params.status) {
      filtered = filtered.filter((r) => r.status === params.status);
    }
    if (params.targetType) {
      filtered = filtered.filter((r) => r.targetType === params.targetType);
    }
    const total = filtered.length;
    const start = (params.page - 1) * params.pageSize;
    const items = filtered.slice(start, start + params.pageSize);
    return { items, total };
  }

  async countPendingByTarget(): Promise<number> {
    return 0;
  }

  async countByReporter(): Promise<number> {
    return 0;
  }

  async updateStatus(): Promise<ContentReport> {
    throw new Error("Not implemented");
  }
}

class FakeListingsReadPort implements ListingsReadPort {
  listings: Record<string, { id: string; sellerId: string; status: string; year: number | null; brandName: string; modelName: string }> = {};

  async getListingSummary(): Promise<null> {
    return null;
  }

  async getListingSummaries(): Promise<[]> {
    return [];
  }

  async getListingAdminSummaries(ids: string[]): Promise<Array<{ id: string; sellerId: string; status: string; year: number | null; brandName: string; modelName: string }>> {
    return ids.map((id) => this.listings[id]).filter((x): x is { id: string; sellerId: string; status: string; year: number | null; brandName: string; modelName: string } => !!x);
  }

  async getListingsForOwner() {
    return { items: [] };
  }

  async matchesFilters(): Promise<boolean> {
    return true;
  }

  seed(id: string, data: { sellerId: string; status: string; year: number | null; brandName: string; modelName: string }) {
    this.listings[id] = { id, ...data };
  }
}

class FakeIdentityReadPort implements IdentityReadPort {
  users: Record<string, { id: string; displayName: string | null; role: string; suspendedAt: Date | null; suspendedById: string | null; suspensionReason: string | null }> = {};

  async findUserById(id: string): Promise<{ id: string; displayName: string | null; role: string; suspendedAt: Date | null; suspendedById: string | null; suspensionReason: string | null } | null> {
    return this.users[id] ?? null;
  }

  async findUsersByIds(ids: string[]): Promise<Array<{ id: string; displayName: string | null; role: string; suspendedAt: Date | null; suspendedById: string | null; suspensionReason: string | null }>> {
    return ids.map((id) => this.users[id]).filter((x): x is { id: string; displayName: string | null; role: string; suspendedAt: Date | null; suspendedById: string | null; suspensionReason: string | null } => !!x);
  }

  async isUserBlockedBy(): Promise<boolean> {
    return false;
  }

  seed(id: string, user: { displayName?: string | null; role?: string; suspendedAt?: Date | null }) {
    this.users[id] = {
      id,
      displayName: user.displayName ?? null,
      role: user.role ?? "buyer",
      suspendedAt: user.suspendedAt ?? null,
      suspendedById: null,
      suspensionReason: null,
    };
  }
}

function makeReport(id: string, targetType: "listing" | "user", targetId: string, status = "pending", reason = "spam", createdAt = new Date("2026-01-01T00:00:00Z")) {
  return ContentReport.reconstruct({
    id,
    reporterUserId: "reporter-1",
    targetType,
    targetId,
    reason: reason as ContentReport["reason"],
    details: null,
    status: status as ContentReport["status"],
    reviewedById: null,
    reviewedAt: null,
    createdAt,
  });
}

function makeUseCase(
  repo?: FakeContentReportRepository,
  listings?: FakeListingsReadPort,
  identity?: FakeIdentityReadPort,
) {
  return new ListReports(
    repo ?? new FakeContentReportRepository(),
    listings ?? new FakeListingsReadPort(),
    identity ?? new FakeIdentityReadPort(),
  );
}

describe("ListReports", () => {
  let repo: FakeContentReportRepository;
  let listings: FakeListingsReadPort;
  let identity: FakeIdentityReadPort;

  beforeEach(() => {
    repo = new FakeContentReportRepository();
    listings = new FakeListingsReadPort();
    identity = new FakeIdentityReadPort();
  });

  it("defaults to pending status and oldest-first order", async () => {
    const r1 = makeReport("r1", "listing", "l1", "pending");
    const r2 = makeReport("r2", "listing", "l2", "pending", "spam", new Date("2026-01-02T00:00:00Z"));
    repo.reports = [r1, r2];

    listings.seed("l1", { sellerId: "s1", status: "active", year: 2020, brandName: "Toyota", modelName: "Camry" });
    listings.seed("l2", { sellerId: "s2", status: "active", year: 2021, brandName: "Honda", modelName: "Civic" });

    const uc = makeUseCase(repo, listings, identity);
    const result = await uc.execute({});

    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.id).toBe("r1");
    expect(result.items[1]!.id).toBe("r2");
    expect(result.total).toBe(2);
  });

  it("defaults status filter to pending when omitted", async () => {
    repo.reports = [
      makeReport("r1", "listing", "l1", "pending"),
      makeReport("r2", "listing", "l2", "dismissed"),
    ];
    listings.seed("l1", { sellerId: "s1", status: "active", year: 2020, brandName: "Toyota", modelName: "Camry" });

    const uc = makeUseCase(repo, listings, identity);
    const result = await uc.execute({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("r1");
    expect(result.total).toBe(1);
  });

  it("filters by status", async () => {
    repo.reports = [
      makeReport("r1", "listing", "l1", "pending"),
      makeReport("r2", "listing", "l2", "dismissed"),
    ];
    listings.seed("l1", { sellerId: "s1", status: "active", year: 2020, brandName: "Toyota", modelName: "Camry" });
    listings.seed("l2", { sellerId: "s2", status: "active", year: 2021, brandName: "Honda", modelName: "Civic" });

    const uc = makeUseCase(repo, listings, identity);
    const result = await uc.execute({ status: "dismissed" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("r2");
  });

  it("filters by targetType", async () => {
    repo.reports = [
      makeReport("r1", "listing", "l1", "pending"),
      makeReport("r2", "user", "u1", "pending"),
    ];
    listings.seed("l1", { sellerId: "s1", status: "active", year: 2020, brandName: "Toyota", modelName: "Camry" });
    identity.seed("u1", { displayName: "Alice" });

    const uc = makeUseCase(repo, listings, identity);
    const result = await uc.execute({ targetType: "user" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("r2");
  });

  it("returns exact lean row fields only", async () => {
    repo.reports = [makeReport("r1", "listing", "l1", "pending")];
    listings.seed("l1", { sellerId: "s1", status: "active", year: 2020, brandName: "Toyota", modelName: "Camry" });

    const uc = makeUseCase(repo, listings, identity);
    const result = await uc.execute({});

    const row = result.items[0];
    expect(row).toHaveProperty("id");
    expect(row).toHaveProperty("status");
    expect(row).toHaveProperty("createdAt");
    expect(row).toHaveProperty("reason");
    expect(row).toHaveProperty("targetType");
    expect(row).toHaveProperty("targetId");
    expect(row).toHaveProperty("targetSummary");
    expect(row).not.toHaveProperty("details");
    expect(row).not.toHaveProperty("reporterUserId");
  });

  it("marks unavailable targets", async () => {
    repo.reports = [makeReport("r1", "listing", "missing-listing", "pending")];

    const uc = makeUseCase(repo, listings, identity);
    const result = await uc.execute({});

    expect(result.items[0]!.targetSummary.available).toBe(false);
    expect(result.items[0]!.targetSummary.label).toBe("Unavailable target");
  });

  it("returns 400 for invalid status", async () => {
    const uc = makeUseCase(repo, listings, identity);
    await expect(uc.execute({ status: "invalid" })).rejects.toThrow(BadRequestException);
  });

  it("returns 400 for invalid targetType", async () => {
    const uc = makeUseCase(repo, listings, identity);
    await expect(uc.execute({ targetType: "invalid" })).rejects.toThrow(BadRequestException);
  });

  it("returns 400 for invalid page", async () => {
    const uc = makeUseCase(repo, listings, identity);
    await expect(uc.execute({ page: 0 })).rejects.toThrow(BadRequestException);
  });

  it("returns 400 for invalid pageSize", async () => {
    const uc = makeUseCase(repo, listings, identity);
    await expect(uc.execute({ pageSize: 500 })).rejects.toThrow(BadRequestException);
  });

  it("returns empty rows for out-of-range page", async () => {
    repo.reports = [makeReport("r1", "listing", "l1", "pending")];
    listings.seed("l1", { sellerId: "s1", status: "active", year: 2020, brandName: "Toyota", modelName: "Camry" });

    const uc = makeUseCase(repo, listings, identity);
    const result = await uc.execute({ page: 5 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it("resolves user target summary with displayName", async () => {
    repo.reports = [makeReport("r1", "user", "u1", "pending")];
    identity.seed("u1", { displayName: "Alice" });

    const uc = makeUseCase(repo, listings, identity);
    const result = await uc.execute({});

    expect(result.items[0]!.targetSummary.available).toBe(true);
    expect(result.items[0]!.targetSummary.label).toBe("Alice");
  });

  it("resolves listing target summary with year/make/model", async () => {
    repo.reports = [makeReport("r1", "listing", "l1", "pending")];
    listings.seed("l1", { sellerId: "s1", status: "active", year: 2020, brandName: "Toyota", modelName: "Camry" });

    const uc = makeUseCase(repo, listings, identity);
    const result = await uc.execute({});

    expect(result.items[0]!.targetSummary.available).toBe(true);
    expect(result.items[0]!.targetSummary.label).toBe("2020 Toyota Camry");
  });

  it("resolves listing target summary without year", async () => {
    repo.reports = [makeReport("r1", "listing", "l1", "pending")];
    listings.seed("l1", { sellerId: "s1", status: "active", year: null, brandName: "Toyota", modelName: "Camry" });

    const uc = makeUseCase(repo, listings, identity);
    const result = await uc.execute({});

    expect(result.items[0]!.targetSummary.label).toBe("Toyota Camry");
  });
});
