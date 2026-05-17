import type { Region } from "../Region";

export interface RegionRepository {
  listRegions(opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<Region[]>;

  getRegionById(id: string): Promise<Region | null>;
}

export const REGION_REPOSITORY = Symbol("RegionRepository");
