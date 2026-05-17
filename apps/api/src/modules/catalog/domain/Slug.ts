import slugify from "slugify";

const MAX_LENGTH = 100;

export class Slug {
  private constructor(readonly value: string) {}

  static create(nameEn: string, nameRu?: string, nameTk?: string): Slug {
    const raw = Slug.pickCanonical(nameEn, nameRu, nameTk);
    if (!raw || raw.trim().length === 0) {
      throw new Error("Slug source cannot be empty or whitespace-only");
    }

    const normalized = slugify(raw, {
      lower: true,
      strict: true,
      trim: true,
    });

    if (!normalized || normalized.length === 0) {
      throw new Error("Slug could not be generated from the provided input");
    }

    const truncated =
      normalized.length > MAX_LENGTH
        ? normalized.slice(0, MAX_LENGTH)
        : normalized;

    return new Slug(truncated);
  }

  private static pickCanonical(
    nameEn?: string,
    nameRu?: string,
    nameTk?: string,
  ): string {
    if (nameEn && nameEn.trim().length > 0) return nameEn.trim();
    if (nameRu && nameRu.trim().length > 0) return nameRu.trim();
    if (nameTk && nameTk.trim().length > 0) return nameTk.trim();
    return "";
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }
}
