import type { Model } from "../Model";

export interface ModelRepository {
  listModelsByBrand(opts: {
    brandId: string;
    locale: "tk" | "ru" | "en";
    cursor?: { name: string; id: string };
    limit?: number;
  }): Promise<{ items: Model[]; nextCursor?: { name: string; id: string } | undefined }>;

  getModelById(id: string): Promise<Model | null>;
}

export const MODEL_REPOSITORY = Symbol("ModelRepository");
