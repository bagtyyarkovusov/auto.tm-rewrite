import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";

import { ContentReport } from "../domain/ContentReport";
import type { ContentReportRepository } from "../domain/ports/ContentReportRepository";
import type { ListingsReadPort, ListingSummary } from "../../listings/domain/ports/ListingsReadPort";
import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { AdminSchemas } from "@auto-tm/contracts";

import { CreateReport } from "./CreateReport";

class FakeContentReportRepository implements ContentReportRepository {
  reports: ContentReport[] = [];

  async save(report: ContentReport): Promise<ContentReport> {
    this.reports.push(report);
    return report;
  }

  async findById(_id: string): Promise<ContentReport | null> {
    return null;
  }

  async findPendingByReporterAndTarget(
    reporterUserId: string,
    targetType: string,
    targetId: string,
  ): Promise<ContentReport | null> {
    return (
      this.reports.find(
        (r) =>
          r.reporterUserId === reporterUserId &&
          r.targetType === targetType &&
          r.targetId === targetId &&
          r.status === "pending",
      ) ?? null
    );
  }

  async findMany(): Promise<{ items: ContentReport[]; total: number }> {
    return { items: [], total: 0 };
  }

  async countPendingByTarget(): Promise<number> {
    return 0;
  }

  async countByReporter(): Promise<number> {
    return 0;
  }
}

class FakeListingsReadPort implements ListingsReadPort {
  listings: Record<string, ListingSummary> = {};

  async getListingSummary(id: string): Promise<ListingSummary | null> {
    return this.listings[id] ?? null;
  }

  async getListingSummaries(_ids: string[]): Promise<ListingSummary[]> {
    return [];
  }

  async getListingsForOwner(): Promise<{ items: ListingSummary[]; nextCursor?: { timestamp: string; id: string } }> {
    return { items: [] };
  }

  async getListingAdminSummaries(): Promise<[]> {
    return [];
  }

  async matchesFilters(): Promise<boolean> {
    return true;
  }

  seed(id: string, summary: ListingSummary) {
    this.listings[id] = summary;
  }
}

class FakeIdentityReadPort implements IdentityReadPort {
  users: Record<string, { id: string; displayName: string | null; role: string; suspendedAt: Date | null; suspendedById: string | null; suspensionReason: string | null }> = {};

  async findUserById(id: string): Promise<{ id: string; displayName: string | null; role: string; suspendedAt: Date | null; suspendedById: string | null; suspensionReason: string | null } | null> {
    return this.users[id] ?? null;
  }

  async findUsersByIds(): Promise<[]> {
    return [];
  }

  seed(id: string, user: { displayName?: string | null; role?: string; suspendedAt?: Date | null; suspendedById?: string | null; suspensionReason?: string | null }) {
    this.users[id] = {
      id,
      displayName: user.displayName ?? null,
      role: user.role ?? "buyer",
      suspendedAt: user.suspendedAt ?? null,
      suspendedById: user.suspendedById ?? null,
      suspensionReason: user.suspensionReason ?? null,
    };
  }
}

class FakeEventEmitter {
  events: Array<{ event: string; payload: unknown }> = [];

  emit(event: string, payload: unknown): void {
    this.events.push({ event, payload });
  }
}

function makeUseCase(
  repo?: FakeContentReportRepository,
  listings?: FakeListingsReadPort,
  identity?: FakeIdentityReadPort,
  events?: FakeEventEmitter,
) {
  return new CreateReport(
    repo ?? new FakeContentReportRepository(),
    listings ?? new FakeListingsReadPort(),
    identity ?? new FakeIdentityReadPort(),
    (events ?? new FakeEventEmitter()) as unknown as ConstructorParameters<typeof CreateReport>[3],
  );
}

function seedActiveListing(listings: FakeListingsReadPort, id: string, sellerId: string) {
  listings.seed(id, {
    id,
    sellerId,
    status: "active",
    brandId: "brand-1",
    modelId: "model-1",
    year: 2020,
    priceAmount: 100000,
    priceCurrency: "TMT",
    displayPriceTmt: 100000,
    cityId: "city-1",
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    allowChat: true,
  });
}

describe("CreateReport", () => {
  let repo: FakeContentReportRepository;
  let listings: FakeListingsReadPort;
  let identity: FakeIdentityReadPort;
  let events: FakeEventEmitter;

  beforeEach(() => {
    repo = new FakeContentReportRepository();
    listings = new FakeListingsReadPort();
    identity = new FakeIdentityReadPort();
    events = new FakeEventEmitter();
  });

  it("creates a new listing report", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    const result = await uc.execute({
      reporterUserId: "reporter-1",
      targetType: "listing",
      targetId: "listing-1",
      request: { reason: "spam" as const },
    });

    expect(result.reusedExisting).toBe(false);
    expect(result.report.status).toBe("pending");
    expect(result.report.reason).toBe("spam");
    expect(result.report.targetType).toBe("listing");
    expect(result.report.targetId).toBe("listing-1");
    expect(repo.reports).toHaveLength(1);
  });

  it("creates a new user report", async () => {
    identity.seed("user-1", { role: "buyer" });
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    const result = await uc.execute({
      reporterUserId: "reporter-1",
      targetType: "user",
      targetId: "user-1",
      request: { reason: "harassment" as const },
    });

    expect(result.reusedExisting).toBe(false);
    expect(result.report.reason).toBe("harassment");
    expect(repo.reports).toHaveLength(1);
  });

  it("emits ContentReportCreated for a new report", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    await uc.execute({
      reporterUserId: "reporter-1",
      targetType: "listing",
      targetId: "listing-1",
      request: { reason: "spam" as const },
    });

    expect(events.events).toHaveLength(1);
    expect(events.events[0]).toMatchObject({
      event: "ContentReportCreated",
      payload: {
        targetType: "listing",
        targetId: "listing-1",
        reporterUserId: "reporter-1",
        reason: "spam",
      },
    });
  });

  it("reuses an existing pending report and emits no event", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    const first = await uc.execute({
      reporterUserId: "reporter-1",
      targetType: "listing",
      targetId: "listing-1",
      request: { reason: "spam" as const },
    });

    const second = await uc.execute({
      reporterUserId: "reporter-1",
      targetType: "listing",
      targetId: "listing-1",
      request: { reason: "spam" as const },
    });

    expect(second.reusedExisting).toBe(true);
    expect(second.report.id).toBe(first.report.id);
    expect(second.report.createdAt).toEqual(first.report.createdAt);
    expect(repo.reports).toHaveLength(1);
    expect(events.events).toHaveLength(1); // only first emits
  });

  it("returns NOT_FOUND for missing listing", async () => {
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    await expect(
      uc.execute({
        reporterUserId: "reporter-1",
        targetType: "listing",
        targetId: "missing-listing",
        request: { reason: "spam" as const },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("returns NOT_FOUND for archived listing", async () => {
    listings.seed("listing-1", {
      id: "listing-1",
      sellerId: "seller-1",
      status: "archived",
      brandId: "brand-1",
      modelId: "model-1",
      year: 2020,
      priceAmount: 100000,
      priceCurrency: "TMT",
      displayPriceTmt: 100000,
      cityId: "city-1",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      allowChat: true,
    });
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    await expect(
      uc.execute({
        reporterUserId: "reporter-1",
        targetType: "listing",
        targetId: "listing-1",
        request: { reason: "spam" as const },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("returns REPORT_TARGET_NOT_REPORTABLE for sold listing", async () => {
    listings.seed("listing-1", {
      id: "listing-1",
      sellerId: "seller-1",
      status: "sold",
      brandId: "brand-1",
      modelId: "model-1",
      year: 2020,
      priceAmount: 100000,
      priceCurrency: "TMT",
      displayPriceTmt: 100000,
      cityId: "city-1",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      allowChat: true,
    });
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    try {
      await uc.execute({
        reporterUserId: "reporter-1",
        targetType: "listing",
        targetId: "listing-1",
        request: { reason: "spam" as const },
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as BadRequestException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response["code"]).toBe("VALIDATION_FAILED");
      expect(response["details"]).toMatchObject({
        reason: "REPORT_TARGET_NOT_REPORTABLE",
      });
    }
  });

  it("returns NOT_FOUND for missing user", async () => {
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    await expect(
      uc.execute({
        reporterUserId: "reporter-1",
        targetType: "user",
        targetId: "missing-user",
        request: { reason: "harassment" as const },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("returns SELF_REPORT_NOT_ALLOWED for own profile", async () => {
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    try {
      await uc.execute({
        reporterUserId: "reporter-1",
        targetType: "user",
        targetId: "reporter-1",
        request: { reason: "harassment" as const },
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as BadRequestException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response["code"]).toBe("VALIDATION_FAILED");
      expect(response["details"]).toMatchObject({
        reason: "SELF_REPORT_NOT_ALLOWED",
      });
    }
  });

  it("returns SELF_REPORT_NOT_ALLOWED for own listing", async () => {
    seedActiveListing(listings, "listing-1", "reporter-1");
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    try {
      await uc.execute({
        reporterUserId: "reporter-1",
        targetType: "listing",
        targetId: "listing-1",
        request: { reason: "spam" as const },
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as BadRequestException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response["code"]).toBe("VALIDATION_FAILED");
      expect(response["details"]).toMatchObject({
        reason: "SELF_REPORT_NOT_ALLOWED",
      });
    }
  });

  it("returns USER_SUSPENDED for suspended reporter", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("reporter-1", { role: "buyer", suspendedAt: new Date() });

    const uc = makeUseCase(repo, listings, identity, events);
    try {
      await uc.execute({
        reporterUserId: "reporter-1",
        targetType: "listing",
        targetId: "listing-1",
        request: { reason: "spam" as const },
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as ForbiddenException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response["code"]).toBe("FORBIDDEN");
      expect(response["details"]).toMatchObject({
        reason: "USER_SUSPENDED",
      });
    }
  });

  it("allows reporting a visible admin user without role leakage", async () => {
    identity.seed("admin-1", { role: "admin" });
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    const result = await uc.execute({
      reporterUserId: "reporter-1",
      targetType: "user",
      targetId: "admin-1",
      request: { reason: "spam" as const },
    });

    expect(result.reusedExisting).toBe(false);
    expect(repo.reports).toHaveLength(1);
  });

  it("allows reporting a suspended user target", async () => {
    identity.seed("user-1", { role: "buyer", suspendedAt: new Date() });
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    const result = await uc.execute({
      reporterUserId: "reporter-1",
      targetType: "user",
      targetId: "user-1",
      request: { reason: "harassment" as const },
    });

    expect(result.reusedExisting).toBe(false);
    expect(repo.reports).toHaveLength(1);
  });

  it("requires details for other reason", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    await expect(
      uc.execute({
        reporterUserId: "reporter-1",
        targetType: "listing",
        targetId: "listing-1",
        request: { reason: "other" as const },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("accepts details for other reason", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    const result = await uc.execute({
      reporterUserId: "reporter-1",
      targetType: "listing",
      targetId: "listing-1",
      request: { reason: "other" as const, details: "Something wrong" },
    });

    expect(result.report.details).toBe("Something wrong");
  });

  it("rejects wrong_category for user reports at domain level", async () => {
    identity.seed("user-1", { role: "buyer" });
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    await expect(
      uc.execute({
        reporterUserId: "reporter-1",
        targetType: "user",
        targetId: "user-1",
        request: { reason: "wrong_category" as const },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects harassment for listing reports at domain level", async () => {
    seedActiveListing(listings, "listing-1", "seller-1");
    identity.seed("reporter-1", { role: "buyer" });

    const uc = makeUseCase(repo, listings, identity, events);
    await expect(
      uc.execute({
        reporterUserId: "reporter-1",
        targetType: "listing",
        targetId: "listing-1",
        request: { reason: "harassment" as const },
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
