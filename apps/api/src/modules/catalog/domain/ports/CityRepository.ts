import type { City } from "../City";

export interface CityRepository {
  listCitiesByRegion(opts: {
    regionId: string;
    locale: "tk" | "ru" | "en";
    cursor?: { name: string; id: string };
    limit?: number;
  }): Promise<{ items: City[]; nextCursor?: { name: string; id: string } | undefined }>;

  getCityById(id: string): Promise<City | null>;
}

export const CITY_REPOSITORY = Symbol("CityRepository");
