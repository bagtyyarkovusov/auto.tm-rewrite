import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { UnrecoverableError } from "bullmq";

@Processor("video-transcode")
export class VideoTranscodeProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoTranscodeProcessor.name);

  async process(): Promise<void> {
    const reason = "video-transcode is not implemented; no work was performed";
    this.logger.error(reason);
    throw new UnrecoverableError(reason);
  }
}
