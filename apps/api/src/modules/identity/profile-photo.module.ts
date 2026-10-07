import { Module } from "@nestjs/common";

import { ListingsModule } from "../listings/listings.module";
import { RemoveProfilePhoto } from "./application/RemoveProfilePhoto";
import { SetProfilePhoto } from "./application/SetProfilePhoto";
import { IdentityModule } from "./identity.module";
import { MePhotoController } from "./presentation/MePhotoController";

/**
 * Composes identity's Profile Photo use-cases with the upload boundary.
 *
 * `ListingsModule` imports `IdentityModule`, so `IdentityModule` cannot import
 * Listings back. This module sits above both instead: it takes `/me` and the
 * User from `IdentityModule` and `PROFILE_PHOTO_PORT` from `ListingsModule`,
 * which binds it to its upload adapter. This file is the only place identity
 * names Listings, and only for Nest composition; lint rejects any other import.
 */
@Module({
  imports: [IdentityModule, ListingsModule],
  controllers: [MePhotoController],
  providers: [SetProfilePhoto, RemoveProfilePhoto],
})
export class ProfilePhotoModule {}
