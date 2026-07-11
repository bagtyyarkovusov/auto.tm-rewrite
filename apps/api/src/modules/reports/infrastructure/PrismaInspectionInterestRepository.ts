import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import { InspectionInterest } from "../domain/InspectionInterest";
import type {
  InspectionInterestCountItem,
  InspectionInterestRepository,
} from "../domain/ports/InspectionInterestRepository";

@Injectable()
export class PrismaInspectionInterestRepository
  implements InspectionInterestRepository
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(interest: InspectionInterest): Promise<InspectionInterest> {
    const row = await this.prisma.inspectionInterest.create({
      data: this.toRow(interest),
    });
    return this.toDomain(row);
  }

  async findByListingAndRequester(
    listingId: string,
    requesterUserId: string,
  ): Promise<InspectionInterest | null> {
    const row = await this.prisma.inspectionInterest.findUnique({
      where: {
        listingId_requesterUserId: {
          listingId,
          requesterUserId,
        },
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async update(interest: InspectionInterest): Promise<InspectionInterest> {
    const row = await this.prisma.inspectionInterest.update({
      where: { id: interest.id },
      data: {
        side: interest.side,
        willingnessToPayTmt: interest.willingnessToPayTmt,
        updatedAt: interest.updatedAt,
      },
    });

    return this.toDomain(row);
  }

  async aggregateByListing(params: {
    page: number;
    pageSize: number;
  }): Promise<{ items: InspectionInterestCountItem[]; total: number }> {
    const skip = (params.page - 1) * params.pageSize;

    const [listingGroups, totalResult] = await Promise.all([
      this.prisma.inspectionInterest.groupBy({
        by: ["listingId"],
        _count: { _all: true },
        skip,
        take: params.pageSize,
        orderBy: { listingId: "asc" },
      }),
      this.prisma.inspectionInterest.groupBy({
        by: ["listingId"],
        _count: { _all: true },
      }),
    ]);

    const listingIds = listingGroups.map((r) => r.listingId);

    const [sideCounts, willingnessRows] = await Promise.all([
      this.prisma.inspectionInterest.groupBy({
        by: ["listingId", "side"],
        _count: { _all: true },
        where: { listingId: { in: listingIds } },
      }),
      this.prisma.inspectionInterest.groupBy({
        by: ["listingId"],
        _count: { willingnessToPayTmt: true },
        _sum: { willingnessToPayTmt: true },
        where: {
          listingId: { in: listingIds },
          willingnessToPayTmt: { not: null },
        },
      }),
    ]);

    const sideCountMap = new Map<
      string,
      { buyer: number; seller: number }
    >();
    for (const sc of sideCounts) {
      const current = sideCountMap.get(sc.listingId) ?? { buyer: 0, seller: 0 };
      if (sc.side === "buyer" || sc.side === "seller") {
        current[sc.side] = sc._count._all;
      }
      sideCountMap.set(sc.listingId, current);
    }

    const willingnessMap = new Map<
      string,
      { sum: number; count: number }
    >();
    for (const w of willingnessRows) {
      willingnessMap.set(w.listingId, {
        sum: w._sum.willingnessToPayTmt ?? 0,
        count: w._count.willingnessToPayTmt ?? 0,
      });
    }

    const items: InspectionInterestCountItem[] = listingGroups.map((r) => {
      const counts = sideCountMap.get(r.listingId) ?? { buyer: 0, seller: 0 };
      const willingness = willingnessMap.get(r.listingId) ?? {
        sum: 0,
        count: 0,
      };
      return {
        listingId: r.listingId,
        totalInterest: r._count._all,
        buyerInterest: counts.buyer,
        sellerInterest: counts.seller,
        willingnessToPayTmtSum: willingness.sum,
        willingnessToPayTmtCount: willingness.count,
        willingnessToPayTmtAvg:
          willingness.count > 0 ? willingness.sum / willingness.count : null,
      };
    });

    return { items, total: totalResult.length };
  }

  private toRow(interest: InspectionInterest) {
    return {
      id: interest.id,
      listingId: interest.listingId,
      requesterUserId: interest.requesterUserId,
      side: interest.side,
      willingnessToPayTmt: interest.willingnessToPayTmt,
      createdAt: interest.createdAt,
      updatedAt: interest.updatedAt,
    };
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["inspectionInterest"]["create"]>>,
  ): InspectionInterest {
    return InspectionInterest.reconstruct({
      id: row.id,
      listingId: row.listingId,
      requesterUserId: row.requesterUserId,
      side: row.side as "buyer" | "seller",
      willingnessToPayTmt: row.willingnessToPayTmt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
