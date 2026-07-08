import { Inject, Injectable } from "@nestjs/common";

import { ListingsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import { VERIFIED_PHONE_TRUST } from "../domain/types";
import {
  LISTINGS_READ_PORT,
  type ListingsReadPort,
} from "../domain/ports/ListingsReadPort";

export interface ListMyListingsInput {
  userId: string;
  cursor?: string;
  limit?: number;
}

export type MyListingsResponseDto = z.infer<typeof ListingsSchemas.MyListingsResponseSchema>;

@Injectable()
export class ListMyListings {
  constructor(
    @Inject(LISTINGS_READ_PORT)
    private readonly listingsRead: ListingsReadPort,
  ) {}

  async execute(input: ListMyListingsInput): Promise<MyListingsResponseDto> {
    const limit = Math.min(input.limit ?? 20, 50);

    const decodedCursor = input.cursor
      ? ListingsSchemas.decodeCursor(input.cursor)
      : undefined;

    const result = await this.listingsRead.getListingsForOwner(input.userId, {
      ...(decodedCursor !== undefined ? { cursor: decodedCursor } : {}),
      limit,
    });

    return {
      items: result.items.map((item) => ({
        id: item.id,
        sellerId: item.sellerId,
        status: item.status,
        brandId: item.brandId,
        modelId: item.modelId,
        year: item.year,
        priceAmount: item.priceAmount,
        priceCurrency: item.priceCurrency,
        displayPriceTmt: item.displayPriceTmt,
        coverMediaKey: item.coverMediaKey,
        cityId: item.cityId,
        publishedAt: item.publishedAt.toISOString(),
        sellerTrust: VERIFIED_PHONE_TRUST,
      })),
      nextCursor: result.nextCursor
        ? ListingsSchemas.encodeCursor(result.nextCursor)
        : null,
    };
  }
}
