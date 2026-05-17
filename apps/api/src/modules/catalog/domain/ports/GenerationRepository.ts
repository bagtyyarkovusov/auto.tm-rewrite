import type { Generation } from "../Generation";

export interface GenerationRepository {
  listGenerationsByModel(opts: {
    modelId: string;
    locale: "tk" | "ru" | "en";
  }): Promise<Generation[]>;

  getGenerationById(id: string): Promise<Generation | null>;
}

export const GENERATION_REPOSITORY = Symbol("GenerationRepository");
