export type Brand = {
  id: string;
  slug: string;
  nameRu: string;
  nameTk: string;
  nameEn: string;
  /** Object key of the uploaded logo; absent or null means no logo (letter fallback). */
  logoKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
