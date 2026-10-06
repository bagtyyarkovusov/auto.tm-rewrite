import { Injectable } from "@nestjs/common";

import type { RandomSourcePort } from "../domain/ports/RandomSourcePort";

@Injectable()
export class MathRandomSource implements RandomSourcePort {
  next(): number {
    return Math.random();
  }
}
