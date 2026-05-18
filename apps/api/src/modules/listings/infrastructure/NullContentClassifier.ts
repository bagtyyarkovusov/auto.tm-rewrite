import { Injectable } from "@nestjs/common";

import type { MediaContentClassifierPort } from "../domain/ports/MediaContentClassifierPort";

@Injectable()
export class NullContentClassifier implements MediaContentClassifierPort {
  async classify(_key: string) {
    return { isAcceptable: true as const, confidence: 1.0 };
  }
}
