import type { SourcedLogoEntry } from "./manifest";

/** Supplies the master file of a manifest entry. Implementations must not skip the checksum check. */
export interface MasterProvider {
  load(entry: SourcedLogoEntry): Promise<Uint8Array>;
}

export class MasterIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MasterIntegrityError";
  }
}

export function sha256Hex(_bytes: Uint8Array): string {
  throw new Error("not implemented");
}

/** Throws MasterIntegrityError unless the bytes hash to the entry's sha256Master. */
export function verifyMasterSha(_entry: SourcedLogoEntry, _bytes: Uint8Array): void {
  throw new Error("not implemented");
}

/** Throws MasterIntegrityError unless the bytes are an SVG or PNG file (never HTML). */
export function assertMasterFormat(_entry: SourcedLogoEntry, _bytes: Uint8Array): void {
  throw new Error("not implemented");
}

export interface MasterProviderOptions {
  /** Gitignored directory where downloaded Commons files are cached. */
  cacheDir: string;
  /** Hosts a download may come from. Defaults to upload.wikimedia.org. */
  allowedHosts?: readonly string[];
  fetchFn?: typeof fetch;
}

export function createMasterProvider(_options: MasterProviderOptions): MasterProvider {
  throw new Error("not implemented");
}
