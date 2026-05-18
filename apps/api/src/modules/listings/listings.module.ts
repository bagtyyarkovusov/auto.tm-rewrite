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
import { PrismaListingRepository } from "./infrastructure/PrismaListingRepository";
import { PrismaExchangeRateRepository } from "./infrastructure/PrismaExchangeRateRepository";
import { MinioMediaStorageAdapter } from "./infrastructure/MinioMediaStorageAdapter";
import { CreateDraft } from "./application/CreateDraft";
import { UpdateDraft } from "./application/UpdateDraft";
import { ListMyDrafts } from "./application/ListMyDrafts";
import { DiscardDraft } from "./application/DiscardDraft";
import { PresignUpload } from "./application/PresignUpload";
import { PublishListing } from "./application/PublishListing";
import { MarkSold } from "./application/MarkSold";
import { ArchiveListing } from "./application/ArchiveListing";
import { RepublishListing } from "./application/RepublishListing";
import { DeleteListing } from "./application/DeleteListing";
import { VIN_DECODER_PORT } from "./domain/ports/VinDecoderPort";
import { MEDIA_CONTENT_CLASSIFIER_PORT } from "./domain/ports/MediaContentClassifierPort";
import { FEED_RANKING_PORT } from "./domain/ports/FeedRankingPort";
import { LISTING_EVENT_PUBLISHER } from "./domain/ports/ListingEventPublisher";
import { LISTING_DRAFT_REPOSITORY } from "./domain/ports/ListingDraftRepository";
import { LISTING_REPOSITORY } from "./domain/ports/ListingRepository";
import { EXCHANGE_RATE_PORT } from "./domain/ports/ExchangeRatePort";
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
    PrismaListingRepository,
    PrismaExchangeRateRepository,
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
      provide: LISTING_REPOSITORY,
      useClass: PrismaListingRepository,
    },
    {
      provide: EXCHANGE_RATE_PORT,
      useClass: PrismaExchangeRateRepository,
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
    PublishListing,
    MarkSold,
    ArchiveListing,
    RepublishListing,
    DeleteListing,
  ],
  exports: [
    VIN_DECODER_PORT,
    MEDIA_CONTENT_CLASSIFIER_PORT,
    FEED_RANKING_PORT,
    LISTING_EVENT_PUBLISHER,
    LISTING_DRAFT_REPOSITORY,
    LISTING_REPOSITORY,
    EXCHANGE_RATE_PORT,
    MEDIA_STORAGE_PORT,
  ],
})
export class ListingsModule {}
