export type ListingStatus = "active" | "sold" | "archived";

const TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  active: ["sold", "archived"],
  sold: ["archived"],
  archived: ["active"],
};

export function canTransition(
  from: ListingStatus,
  to: ListingStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
