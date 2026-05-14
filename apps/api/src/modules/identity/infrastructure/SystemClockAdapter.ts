import { Injectable } from "@nestjs/common";
import type { ClockPort } from "../domain/ports/ClockPort";

@Injectable()
export class SystemClockAdapter implements ClockPort {
  now(): Date {
    return new Date();
  }
}
