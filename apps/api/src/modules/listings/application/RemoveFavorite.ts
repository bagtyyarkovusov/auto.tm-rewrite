import { Inject, Injectable } from "@nestjs/common";

import {
  FAVORITE_REPOSITORY,
  type FavoriteRepository,
} from "../domain/ports/FavoriteRepository";

export interface RemoveFavoriteInput {
  userId: string;
  listingId: string;
}

@Injectable()
export class RemoveFavorite {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favorites: FavoriteRepository,
  ) {}

  async execute(input: RemoveFavoriteInput): Promise<{ success: boolean }> {
    await this.favorites.remove(input.userId, input.listingId);
    return { success: true };
  }
}
