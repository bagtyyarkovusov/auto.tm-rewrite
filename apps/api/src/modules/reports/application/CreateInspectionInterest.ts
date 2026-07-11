import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type { ListingsReadPort } from "../../listings/domain/ports/ListingsReadPort";
import { LISTINGS_READ_PORT } from "../../listings/domain/ports/ListingsReadPort";
import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { IDENTITY_READ_PORT } from "../../identity/domain/ports/IdentityReadPort";
import type { ReportsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import { InspectionInterest } from "../domain/InspectionInterest";
import { DomainError } from "../domain/types";
import type { InspectionInterestRepository } from "../domain/ports/InspectionInterestRepository";
import { INSPECTION_INTEREST_REPOSITORY } from "../domain/ports/InspectionInterestRepository";

type CreateInspectionInterestRequest = z.infer<
  typeof ReportsSchemas.CreateInspectionInterestRequestSchema
>;

export interface CreateInspectionInterestInput {
  listingId: string;
  requesterUserId: string;
  request: CreateInspectionInterestRequest;
}

export interface CreateInspectionInterestResult {
  interest: InspectionInterest;
  reusedExisting: boolean;
}

@Injectable()
export class CreateInspectionInterest {
  constructor(
    @Inject(INSPECTION_INTEREST_REPOSITORY)
    private readonly repo: InspectionInterestRepository,
    @Inject(LISTINGS_READ_PORT)
    private readonly listingsRead: ListingsReadPort,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
  ) {}

  async execute(
    input: CreateInspectionInterestInput,
  ): Promise<CreateInspectionInterestResult> {
    const requester = await this.identityRead.findUserById(
      input.requesterUserId,
    );
    if (requester?.suspendedAt) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "User is suspended",
        details: { reason: "USER_SUSPENDED" },
      });
    }

    const listing = await this.listingsRead.getListingSummary(input.listingId);
    if (!listing) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Listing not found",
      });
    }

    if (listing.status !== "active") {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Listing not found",
      });
    }

    const side =
      listing.sellerId === input.requesterUserId ? "seller" : "buyer";

    const existing = await this.repo.findByListingAndRequester(
      input.listingId,
      input.requesterUserId,
    );

    if (existing) {
      const updated =
        input.request.willingnessToPayTmt !== undefined
          ? await this.repo.update(
              existing.withWillingnessToPay(input.request.willingnessToPayTmt),
            )
          : existing;
      return { interest: updated, reusedExisting: true };
    }

    try {
      const interest = InspectionInterest.create({
        id: randomUUID(),
        listingId: input.listingId,
        requesterUserId: input.requesterUserId,
        side,
        willingnessToPayTmt: input.request.willingnessToPayTmt ?? null,
      });
      const saved = await this.repo.save(interest);
      return { interest: saved, reusedExisting: false };
    } catch (err) {
      if (err instanceof DomainError) {
        throw new BadRequestException({
          code: "VALIDATION_FAILED",
          message: err.message,
          details: { reason: err.code },
        });
      }
      throw err;
    }
  }
}
