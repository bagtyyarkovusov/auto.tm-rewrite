import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type {
  UploadClaimPort,
  UploadFinalization,
  UploadReservation,
} from "../domain/ports/UploadClaimPort";

/** Scaffold for #721: the claim protocol is not implemented yet. */
@Injectable()
export class PrismaUploadClaims implements UploadClaimPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async reserve(_input: Parameters<UploadClaimPort["reserve"]>[0]): Promise<UploadReservation> {
    return { token: randomUUID() };
  }

  async finalize(_tx: unknown, _input: UploadFinalization): Promise<"adopted" | "already"> {
    return "adopted";
  }

  async retire(_tx: unknown, _uploadId: string): Promise<boolean> {
    return false;
  }

  async abandon(_token: string): Promise<void> {}
}
