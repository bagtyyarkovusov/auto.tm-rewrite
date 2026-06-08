import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import { AdminSchemas } from "@auto-tm/contracts";

import type { ListingsReadPort } from "../../listings/domain/ports/ListingsReadPort";
import { LISTINGS_READ_PORT } from "../../listings/domain/ports/ListingsReadPort";
import type { ListingsAdminPort } from "../../listings/domain/ports/ListingsAdminPort";
import { LISTINGS_ADMIN_PORT } from "../../listings/domain/ports/ListingsAdminPort";
import type { AuditLogRepository } from "../domain/ports/AuditLogRepository";
import { AUDIT_LOG_REPOSITORY } from "../domain/ports/AuditLogRepository";

export interface UnbanListingInput {
  listingId: string;
  adminUserId: string;
  reason: string;
}

export interface UnbanListingResult {
  targetId: string;
  targetState: { status: string };
  auditLogId: string;
}

@Injectable()
export class UnbanListing {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(LISTINGS_READ_PORT)
    private readonly listingsRead: ListingsReadPort,
    @Inject(LISTINGS_ADMIN_PORT)
    private readonly listingsAdmin: ListingsAdminPort,
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditRepo: AuditLogRepository,
  ) {}

  async execute(input: UnbanListingInput): Promise<UnbanListingResult> {
    // 1. Validate listing exists and is banned
    const listings = await this.listingsRead.getListingAdminSummaries([
      input.listingId,
    ]);
    const listing = listings[0];

    if (!listing) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Listing not found",
      });
    }

    if (listing.status !== "banned") {
      throw new ConflictException({
        code: "CONFLICT",
        message: "Listing is not in a state that can be unbanned",
        details: {
          reason: AdminSchemas.AdminErrorReason.ModerationTargetStateConflict,
          targetState: { status: listing.status },
        },
      });
    }

    // 2. Execute mutation + audit in one transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const unbanResult = await this.listingsAdmin.unbanBannedListing(
        input.listingId,
        tx,
      );

      const auditRow = await this.auditRepo.create(
        {
          actorId: input.adminUserId,
          action: AdminSchemas.AdminAuditAction.ListingUnban,
          targetType: "listing",
          targetId: input.listingId,
          details: {
            reason: input.reason,
            before: { status: "banned" },
            after: { status: unbanResult.status },
          },
        },
        tx,
      );

      return {
        targetId: input.listingId,
        targetState: { status: unbanResult.status },
        auditLogId: auditRow.id,
      };
    });

    return result;
  }
}
