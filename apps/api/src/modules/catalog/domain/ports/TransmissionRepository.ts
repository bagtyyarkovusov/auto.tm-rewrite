import type { Transmission } from "../Transmission";

export interface TransmissionRepository {
  listTransmissions(opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<Transmission[]>;

  getTransmissionById(id: string): Promise<Transmission | null>;
}

export const TRANSMISSION_REPOSITORY = Symbol("TransmissionRepository");
