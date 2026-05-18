export interface VinDecoderPort {
  decode(vin: string): Promise<
    | { decoded: false }
    | {
        decoded: true;
        brand?: string;
        model?: string;
        year?: number;
        bodyType?: string;
        engineType?: string;
        confidence: number;
      }
  >;
}

export const VIN_DECODER_PORT = Symbol("VinDecoderPort");
