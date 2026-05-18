import { Module } from "@nestjs/common";

import { ListingsController } from "./presentation/listings.controller";
import { NullVinDecoder } from "./infrastructure/NullVinDecoder";
import { NullContentClassifier } from "./infrastructure/NullContentClassifier";
import { ChronologicalRankingAdapter } from "./infrastructure/ChronologicalRankingAdapter";
import { EventEmitterListingEventPublisher } from "./infrastructure/EventEmitterListingEventPublisher";
import { VIN_DECODER_PORT } from "./domain/ports/VinDecoderPort";
import { MEDIA_CONTENT_CLASSIFIER_PORT } from "./domain/ports/MediaContentClassifierPort";
import { FEED_RANKING_PORT } from "./domain/ports/FeedRankingPort";
import { LISTING_EVENT_PUBLISHER } from "./domain/ports/ListingEventPublisher";

@Module({
  controllers: [ListingsController],
  providers: [
    NullVinDecoder,
    NullContentClassifier,
    ChronologicalRankingAdapter,
    EventEmitterListingEventPublisher,
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
  ],
  exports: [
    VIN_DECODER_PORT,
    MEDIA_CONTENT_CLASSIFIER_PORT,
    FEED_RANKING_PORT,
    LISTING_EVENT_PUBLISHER,
  ],
})
export class ListingsModule {}
