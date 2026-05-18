export interface ImageVariantGenerator {
  generate(originalKey: string): Promise<{
    variants: {
      thumbnail: string;
      list: string;
      detail: string;
      fullscreen: string;
    };
  }>;
}

export const IMAGE_VARIANT_GENERATOR = Symbol("ImageVariantGenerator");
