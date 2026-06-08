export type ListingStatus = "active" | "sold" | "archived" | "banned";

const TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  active: ["sold", "archived"],
  sold: ["archived"],
  archived: ["active"],
  banned: [],
};

export function canTransition(
  from: ListingStatus,
  to: ListingStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
