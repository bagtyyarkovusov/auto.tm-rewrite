/**
 * A car's name as every card and row writes it: "Brand Model, year"
 * (32 Listings). Missing parts are left out, so a draft with only a brand
 * reads "Toyota" and one with only a year reads "2018".
 */
export function carTitle(
  brand: string | null | undefined,
  model: string | null | undefined,
  year: number | null | undefined,
): string {
  const name = [brand, model].filter(Boolean).join(" ");
  return [name, year ? String(year) : ""].filter(Boolean).join(", ");
}
