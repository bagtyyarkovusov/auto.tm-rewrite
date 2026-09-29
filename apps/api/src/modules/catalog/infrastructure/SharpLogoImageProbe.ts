import { Injectable } from "@nestjs/common";
import sharp from "sharp";

import type { LogoImageProbe } from "../domain/ports/LogoImageProbe";

@Injectable()
export class SharpLogoImageProbe implements LogoImageProbe {
  async probe(
    bytes: Uint8Array,
  ): Promise<{ format: string; width: number; height: number } | null> {
    try {
      const metadata = await sharp(bytes, { limitInputPixels: 4096 * 4096 }).metadata();
      if (!metadata.format || !metadata.width || !metadata.height) return null;
      return { format: metadata.format, width: metadata.width, height: metadata.height };
    } catch {
      return null;
    }
  }
}
