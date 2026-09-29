/** Reads the real format and pixel size of an image; null when it cannot be decoded. */
export interface LogoImageProbe {
  probe(bytes: Uint8Array): Promise<{ format: string; width: number; height: number } | null>;
}

export const LOGO_IMAGE_PROBE = Symbol("LogoImageProbe");
