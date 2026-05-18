import type { EngineType } from "../EngineType";

export interface EngineTypeRepository {
  listEngineTypes(opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<EngineType[]>;

  getEngineTypeById(id: string): Promise<EngineType | null>;
}

export const ENGINE_TYPE_REPOSITORY = Symbol("EngineTypeRepository");
