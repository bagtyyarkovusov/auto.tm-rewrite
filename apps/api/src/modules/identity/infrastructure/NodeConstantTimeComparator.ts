import { createHash, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";

import type { ConstantTimeComparatorPort } from "../domain/ports/ConstantTimeComparatorPort";

@Injectable()
export class NodeConstantTimeComparator implements ConstantTimeComparatorPort {
  compare(candidate: string, expected: string): boolean {
    const candidateBuffer = Buffer.from(candidate, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");

    if (candidateBuffer.length === expectedBuffer.length) {
      return timingSafeEqual(candidateBuffer, expectedBuffer);
    }

    const candidateDigest = createHash("sha256").update(candidateBuffer).digest();
    const expectedDigest = createHash("sha256").update(expectedBuffer).digest();
    timingSafeEqual(candidateDigest, expectedDigest);
    return false;
  }
}
