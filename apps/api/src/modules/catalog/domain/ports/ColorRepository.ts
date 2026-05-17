import type { Color } from "../Color";

export interface ColorRepository {
  listColors(opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<Color[]>;

  getColorById(id: string): Promise<Color | null>;
}

export const COLOR_REPOSITORY = Symbol("ColorRepository");
