import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";

@Processor("video-transcode")
export class VideoTranscodeProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoTranscodeProcessor.name);

  async process(job: Job<{ listingMediaId: string }>): Promise<void> {
    this.logger.log(
      `[video-transcode] received job ${job.id} for media ${job.data.listingMediaId}`,
    );
    // ffmpeg + HLS variants land in Sprint 8.
  }
}
