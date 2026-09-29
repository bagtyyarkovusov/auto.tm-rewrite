/** Decodes and renders logo images. */
export interface LogoImageProcessor {
  /** The real format and pixel size, or null when the bytes do not decode. */
  probe(bytes: Uint8Array): Promise<{ format: string; width: number; height: number } | null>;
  /** Renders an SVG to a transparent PNG fitting `size` × `size`. */
  rasterizeSvg(bytes: Uint8Array, size: number): Promise<Uint8Array>;
}

export const LOGO_IMAGE_PROCESSOR = Symbol("LogoImageProcessor");
