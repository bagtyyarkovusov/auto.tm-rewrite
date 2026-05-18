import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma.module";

import { ListingsController } from "./presentation/listings.controller";
import { DraftsController } from "./presentation/DraftsController";
import { UploadsController } from "./presentation/UploadsController";

import { NullVinDecoder } from "./infrastructure/NullVinDecoder";
import { NullContentClassifier } from "./infrastructure/NullContentClassifier";
import { ChronologicalRankingAdapter } from "./infrastructure/ChronologicalRankingAdapter";
import { EventEmitterListingEventPublisher } from "./infrastructure/EventEmitterListingEventPublisher";
import { PrismaListingDraftRepository } from "./infrastructure/PrismaListingDraftRepository";
import { MinioMediaStorageAdapter } from "./infrastructure/MinioMediaStorageAdapter";

import { CreateDraft } from "./application/CreateDraft";
import { UpdateDraft } from "./application/UpdateDraft";
import { ListMyDrafts } from "./application/ListMyDrafts";
import { DiscardDraft } from "./application/DiscardDraft";
import { PresignUpload } from "./application/PresignUpload";

import { VIN_DECODER_PORT } from "./domain/ports/VinDecoderPort";
import { MEDIA_CONTENT_CLASSIFIER_PORT } from "./domain/ports/MediaContentClassifierPort";
import { FEED_RANKING_PORT } from "./domain/ports/FeedRankingPort";
import { LISTING_EVENT_PUBLISHER } from "./domain/ports/ListingEventPublisher";
import { LISTING_DRAFT_REPOSITORY } from "./domain/ports/ListingDraftRepository";
import { MEDIA_STORAGE_PORT } from "./domain/ports/MediaStoragePort";

@Module({
  imports: [PrismaModule],
  controllers: [ListingsController, DraftsController, UploadsController],
  providers: [
    // Infrastructure adapters
    NullVinDecoder,
    NullContentClassifier,
    ChronologicalRankingAdapter,
    EventEmitterListingEventPublisher,
    PrismaListingDraftRepository,
    MinioMediaStorageAdapter,

    // Port bindings
    {
      provide: VIN_DECODER_PORT,
      useClass: NullVinDecoder,
    },
    {
      provide: MEDIA_CONTENT_CLASSIFIER_PORT,
      useClass: NullContentClassifier,
    },
    {
      provide: FEED_RANKING_PORT,
      useClass: ChronologicalRankingAdapter,
    },
    {
      provide: LISTING_EVENT_PUBLISHER,
      useClass: EventEmitterListingEventPublisher,
    },
    {
      provide: LISTING_DRAFT_REPOSITORY,
      useClass: PrismaListingDraftRepository,
    },
    {
      provide: MEDIA_STORAGE_PORT,
      useClass: MinioMediaStorageAdapter,
    },

    // Application use-cases
    CreateDraft,
    UpdateDraft,
    ListMyDrafts,
    DiscardDraft,
    PresignUpload,
  ],
  exports: [
    VIN_DECODER_PORT,
    MEDIA_CONTENT_CLASSIFIER_PORT,
    FEED_RANKING_PORT,
    LISTING_EVENT_PUBLISHER,
    LISTING_DRAFT_REPOSITORY,
    MEDIA_STORAGE_PORT,
  ],
})
export class ListingsModule {}
