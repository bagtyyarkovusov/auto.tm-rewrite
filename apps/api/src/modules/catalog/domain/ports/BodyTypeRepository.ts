import type { BodyType } from "../BodyType";

export interface BodyTypeRepository {
  listBodyTypes(opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<BodyType[]>;

  getBodyTypeById(id: string): Promise<BodyType | null>;
}

export const BODY_TYPE_REPOSITORY = Symbol("BodyTypeRepository");
