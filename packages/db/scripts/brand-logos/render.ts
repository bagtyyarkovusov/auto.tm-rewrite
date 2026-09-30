import type { LogoTransform } from "./manifest";

/** 1x, 2x and 3x of the 30 px picker icon. */
export const LOGO_SIZES = [30, 60, 90] as const;
export type LogoSize = (typeof LOGO_SIZES)[number];

export interface RenderedLogo {
  size: LogoSize;
  png: Buffer;
}

export async function renderLogoMask(
  _master: Uint8Array,
  _transform: LogoTransform,
  _size: number,
): Promise<Buffer> {
  throw new Error("not implemented");
}

export async function renderLogoMasks(
  _master: Uint8Array,
  _transform: LogoTransform,
): Promise<RenderedLogo[]> {
  throw new Error("not implemented");
}
