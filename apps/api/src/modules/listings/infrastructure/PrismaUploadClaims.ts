import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import { DomainError, LISTING_ERROR_CODES } from "../domain/types";
import type {
  UploadClaimPort,
  UploadClaimTarget,
  UploadFinalization,
  UploadReservation,
} from "../domain/ports/UploadClaimPort";

/** Long enough for classification and Sharp; a stranded preparation is retired after it. */
const PREPARATION_MINUTES = 10;

type Tx = Pick<PrismaService, "$queryRaw" | "$executeRaw">;

interface LockedUpload {
  id: string;
  userId: string;
  key: string;
  state: string;
  claimToken: string | null;
  claimTargetType: string | null;
  claimTargetId: string | null;
  writeProtocol: string;
  objectKeys: string[];
}

const notAvailable = () =>
  new DomainError(LISTING_ERROR_CODES.UPLOAD_NOT_AVAILABLE, "Upload is no longer available");
const alreadyAttached = () =>
  new DomainError(LISTING_ERROR_CODES.UPLOAD_ALREADY_ATTACHED, "Upload is already attached");
const closed = (upload: LockedUpload) => upload.state === "RETIRED" || upload.state === "DELETED";
const heldBy = (upload: LockedUpload, target: UploadClaimTarget) =>
  upload.claimTargetType === target.type && upload.claimTargetId === target.id;

/**
 * The common claim on `media_uploads` (ADR-0088). Every method first takes the
 * row locks of the uploads it touches, in id order, so the lock decides the
 * single adopter. Callers that also lock a Listing or User take that lock
 * first; this adapter never locks anything but uploads.
 */
@Injectable()
export class PrismaUploadClaims implements UploadClaimPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async reserve(input: Parameters<UploadClaimPort["reserve"]>[0]): Promise<UploadReservation> {
    return this.prisma.$transaction(async (tx) => {
      const uploads = await this.lock(tx, input.uploadIds);
      if (uploads.length !== new Set(input.uploadIds).size ||
        uploads.some((upload) => upload.userId !== input.userId || closed(upload))) {
        throw notAvailable();
      }
      const mine = uploads.every((upload) => heldBy(upload, input.target));
      if (mine && uploads.every((upload) => upload.state === "ADOPTED")) return { alreadyAdopted: true };
      // A retry for the same target joins the attempt already in flight.
      const joined = uploads[0]?.claimToken;
      if (mine && joined && uploads.every((u) => u.state === "PREPARING" && u.claimToken === joined)) {
        return { token: joined };
      }
      if (uploads.some((upload) => upload.state !== "AVAILABLE") ||
        (await this.adopters(tx, input.uploadIds)) > 0) {
        throw alreadyAttached();
      }

      const token = randomUUID();
      await tx.$executeRaw`
        UPDATE media_uploads SET "state" = 'PREPARING', "claimToken" = ${token},
          "claimTargetType" = ${input.target.type}, "claimTargetId" = ${input.target.id},
          "claimDeadline" = now() + ${PREPARATION_MINUTES}::int * interval '1 minute'
        WHERE id = ANY(${input.uploadIds}::text[])`;
      return { token };
    });
  }

  async finalize(tx: unknown, input: UploadFinalization): Promise<"adopted" | "already"> {
    const db = tx as Tx;
    const referenced = input.referencedUploadIds ?? [];
    const locked = await this.lock(db, [...input.uploadIds, ...referenced]);
    const byId = new Map(locked.map((upload) => [upload.id, upload]));
    if (referenced.some((id) => { const upload = byId.get(id); return !upload || closed(upload); })) {
      throw notAvailable();
    }
    const uploads = input.uploadIds.map((id) => byId.get(id));
    if (uploads.some((upload) => !upload || closed(upload))) throw notAvailable();
    const held = uploads as LockedUpload[];
    if (held.every((upload) => upload.state === "ADOPTED" && heldBy(upload, input.target))) return "already";
    if (held.some((u) => u.state !== "PREPARING" || u.claimToken !== input.token || !heldBy(u, input.target))) {
      throw alreadyAttached();
    }
    if ((await this.adopters(db, input.uploadIds)) > 0) throw alreadyAttached();
    await db.$executeRaw`
      UPDATE media_uploads SET "state" = 'ADOPTED', "claimToken" = NULL, "claimDeadline" = NULL
      WHERE id = ANY(${input.uploadIds}::text[])`;
    return "adopted";
  }

  async retire(tx: unknown, uploadId: string): Promise<boolean> {
    const db = tx as Tx;
    const [upload] = await this.lock(db, [uploadId]);
    if (!upload || closed(upload)) return false;
    await db.$executeRaw`
      UPDATE media_uploads SET "state" = 'RETIRED', "retiredAt" = now(),
        "claimToken" = NULL, "claimDeadline" = NULL
      WHERE id = ${uploadId}`;
    // The exact manifest is copied so the work outlives this row. An unfenced
    // legacy upload is recorded, and its bytes stay until deletion is proven safe.
    const fenced = upload.writeProtocol === "conditional-v1";
    await db.$executeRaw`
      INSERT INTO media_upload_cleanups ("uploadId", "key", "objectKeys", "writeProtocol", "status")
      VALUES (${upload.id}, ${upload.key}, ${upload.objectKeys}::text[], ${upload.writeProtocol},
        ${fenced ? "PENDING" : "LEGACY_PENDING"})
      ON CONFLICT ("uploadId") DO NOTHING`;
    return true;
  }

  async abandon(token: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const held = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM media_uploads
        WHERE "claimToken" = ${token} AND "state" = 'PREPARING' ORDER BY id FOR UPDATE`;
      for (const { id } of held) await this.retire(tx, id);
    });
  }

  /**
   * Rows of either kind that already point at these uploads, counted under
   * their locks. Covers a row written before this protocol recorded state; the
   * unique columns stay a backstop.
   */
  private async adopters(db: Tx, ids: string[]): Promise<number> {
    const [row] = await db.$queryRaw<{ total: bigint }[]>`
      SELECT (SELECT count(*) FROM listing_media WHERE "uploadId" = ANY(${ids}::text[])) +
             (SELECT count(*) FROM users WHERE "avatarUploadId" = ANY(${ids}::text[])) AS total`;
    return Number(row?.total ?? 0);
  }

  private lock(db: Tx, ids: string[]): Promise<LockedUpload[]> {
    return db.$queryRaw<LockedUpload[]>`
      SELECT id, "userId", "key", "state", "claimToken", "claimTargetType", "claimTargetId",
        "writeProtocol", "objectKeys"
      FROM media_uploads WHERE id = ANY(${ids}::text[]) ORDER BY id FOR UPDATE`;
  }
}
