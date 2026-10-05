export interface NamedUser {
  displayName: string | null;
  nameNumber: number;
}

export function useDisplayName(): (user: NamedUser) => string {
  return () => "";
}
