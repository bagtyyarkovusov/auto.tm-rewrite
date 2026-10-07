/** The one thing an upload may back: a Listing's media row or a User's Profile Photo. */
export interface UploadClaimTarget {
  type: "listing" | "profile";
  id: string;
}

/**
 * `token` claims the upload for this attempt. `joined` is true when this call
 * attached to an attempt already in flight for the same target instead of
 * creating the token; only the creating attempt (`joined: false`) may abandon
 * it. `alreadyAdopted` answers a retry whose earlier attempt committed.
 */
export type UploadReservation = { token: string; joined: boolean } | { alreadyAdopted: true };

export interface UploadFinalization {
  token: string;
  uploadIds: string[];
  target: UploadClaimTarget;
  /** Uploads the write only references, such as a video poster. They must not be retired. */
  referencedUploadIds?: string[];
}

/**
 * The common claim every adopter of an upload goes through (ADR-0088). The lock
 * on the upload record decides who adopts it; refusals are DomainErrors carrying
 * `UPLOAD_ALREADY_ATTACHED` or `UPLOAD_NOT_AVAILABLE`.
 *
 * `tx` is the adapter's own transaction handle. `finalize` and `retire` run in
 * the transaction that writes or releases the association, so both commit or
 * neither does.
 */
export interface UploadClaimPort {
  /** Reserves all of the User's uploads for one target before any bytes are prepared, or none. */
  reserve(input: {
    userId: string;
    uploadIds: string[];
    target: UploadClaimTarget;
  }): Promise<UploadReservation>;
  /** `already` when a joined retry finds the same target adopted; the caller writes nothing. */
  finalize(tx: unknown, input: UploadFinalization): Promise<"adopted" | "already">;
  /** Closes adoption for good and records the deletion work. False when already retired. */
  retire(tx: unknown, uploadId: string): Promise<boolean>;
  /** A failed preparation is terminal: retires whatever this token still holds. */
  abandon(token: string): Promise<void>;
}

export const UPLOAD_CLAIM_PORT = Symbol("UploadClaimPort");
