import { Injectable } from "@nestjs/common";

import type { VinDecoderPort } from "../domain/ports/VinDecoderPort";

@Injectable()
export class NullVinDecoder implements VinDecoderPort {
  async decode(_vin: string) {
    return { decoded: false as const };
  }
}
